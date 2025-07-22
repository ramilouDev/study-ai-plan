-- SQL para crear la base de datos de usuarios


-- Crear la tabla users si no existe
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Allow public insert" ON users;
DROP POLICY IF EXISTS "Allow individual read" ON users;
DROP POLICY IF EXISTS "Allow individual update" ON users;

-- Permitir inserción pública (necesario para el registro inicial)
CREATE POLICY "Allow public insert"
ON users
FOR INSERT
WITH CHECK (true);

-- Permitir lectura individual
CREATE POLICY "Allow individual read"
ON users
FOR SELECT
USING (true);

-- Permitir actualización individual
CREATE POLICY "Allow individual update"
ON users
FOR UPDATE
USING (true);

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);



-- SQL para crear la base de datos de las preguntas


-- Crear la tabla de preguntas si no existe
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  content_source TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Allow all operations from worker" ON questions;
DROP POLICY IF EXISTS "Enable read for users" ON questions;
DROP POLICY IF EXISTS "Enable insert for users" ON questions;

-- Política para lectura: cualquier usuario puede leer sus propias preguntas
CREATE POLICY "Enable read for users"
ON questions FOR SELECT
USING (true);

-- Política para inserción: permitir inserción con user_id válido
CREATE POLICY "Enable insert for users"
ON questions FOR INSERT
WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 



-- SQL para crear la base de datos de los quizzes



-- Crear la tabla de quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  source_content TEXT, -- Contenido original del PDF
  metadata JSONB, -- Para almacenar información adicional como modelo AI usado, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear la tabla de preguntas
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Users can read their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can insert their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can read quiz questions" ON questions;
DROP POLICY IF EXISTS "Users can insert quiz questions" ON questions;

-- Políticas para quizzes
CREATE POLICY "Users can read their own quizzes"
ON quizzes FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own quizzes"
ON quizzes FOR INSERT
WITH CHECK (true);

-- Políticas para preguntas
CREATE POLICY "Users can read quiz questions"
ON questions FOR SELECT
USING (true);

CREATE POLICY "Users can insert quiz questions"
ON questions FOR INSERT
WITH CHECK (true);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quizzes_updated_at
    BEFORE UPDATE ON quizzes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 