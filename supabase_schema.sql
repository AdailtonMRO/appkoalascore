-- 1. Tabela de Perfis de Usuários (Profiles)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    email TEXT,
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
    api_key UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ler o próprio perfil" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar o próprio perfil" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);


-- 2. Tabela de Configurações (Settings)
CREATE TABLE public.settings (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
    language TEXT DEFAULT 'pt',
    is_voice_muted BOOLEAN DEFAULT false,
    button_mappings JSONB DEFAULT '{}'::jsonb,
    physical_mappings JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ler as próprias configurações" 
    ON public.settings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem modificar as próprias configurações" 
    ON public.settings FOR ALL 
    USING (auth.uid() = user_id);


-- 3. Tabela de Histórico de Partidas (Matches)
CREATE TABLE public.matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    opponent TEXT,
    score JSONB DEFAULT '{}'::jsonb,
    winner TEXT,
    duration INTEGER, -- em segundos
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sync_id TEXT UNIQUE, -- Identificador único do app local para evitar duplicados
    payload JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver as próprias partidas" 
    ON public.matches FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir as próprias partidas" 
    ON public.matches FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar as próprias partidas" 
    ON public.matches FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar as próprias partidas" 
    ON public.matches FOR DELETE 
    USING (auth.uid() = user_id);


-- 4. Função e Trigger para Criar Perfil e Configurações Automaticamente ao Cadastrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Cria o perfil
    INSERT INTO public.profiles (id, email, tier)
    VALUES (new.id, new.email, 'free');

    -- Cria as configurações padrão
    INSERT INTO public.settings (user_id, language, is_voice_muted)
    VALUES (new.id, 'pt', false);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 5. Tabela para receber comandos do Apple Watch (Webhooks)
CREATE TABLE public.watch_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key UUID NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.watch_events ENABLE ROW LEVEL SECURITY;

-- Permite inserções anônimas para facilidade de uso do Atalho do Apple Watch
CREATE POLICY "Qualquer pessoa pode inserir comandos"
    ON public.watch_events FOR INSERT
    WITH CHECK (true);

-- Apenas o dono da api_key pode visualizar os comandos inseridos
CREATE POLICY "Usuários podem visualizar seus comandos"
    ON public.watch_events FOR SELECT
    USING (
        api_key IN (
            SELECT api_key FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Função e gatilho para auto-limpeza de registros antigos para evitar inchaço no banco
CREATE OR REPLACE FUNCTION public.clean_old_watch_events()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.watch_events WHERE created_at < now() - INTERVAL '1 hour';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_clean_old_watch_events
    AFTER INSERT ON public.watch_events
    FOR EACH ROW EXECUTE FUNCTION public.clean_old_watch_events();
