import { Hono } from "hono";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cors } from "hono/cors";

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  OPENROUTER_API_KEY: string;
  WORKER_URL: string;
};

type Variables = {
  supabase: SupabaseClient;
};

const app = new Hono<{
  Bindings: Bindings;
  Variables: Variables;
}>();

// CORS middleware
app.use("/*", async (c, next) => {
  return await cors({
    origin: [
      "http://localhost:5173",
      c.env.WORKER_URL,
    ],
    credentials: true,
    maxAge: 86400, // 24 horas
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length", "X-Request-Id"],
  })(c, next);
});

// Middleware to add Supabase client
app.use("*", async (c, next) => {
  try {
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false, // importante para Cloudflare Workers
      }
    });

    c.set("supabase", supabase);
    await next();
  } catch (error) {
    console.error("Error initializing Supabase client:", error);
    return c.json(
      {
        success: false,
        message: "Failed to initialize database connection",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Health check endpoint con verificación de secrets
app.get("/api/health", (c) => {
  const hasSupabaseConfig = c.env.SUPABASE_URL && c.env.SUPABASE_ANON_KEY;

  return c.json({
    status: "ok",
    message: "Worker is running",
    databaseConfigured: hasSupabaseConfig,
    timestamp: new Date().toISOString(),
  });
});

// Test Supabase connection
app.get("/api/supabase/test", async (c) => {
  try {
    const supabase = c.get("supabase");

    const { error } = await supabase.from("test").select("*").limit(1);

    if (error && error.code !== "42P01") {
      throw error;
    }

    return c.json({
      success: true,
      message: "Supabase connection successful",
      connected: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Supabase connection error:", error);
    return c.json(
      {
        success: false,
        message: "Supabase connection failed",
        error: error instanceof Error ? error.message : "Unknown error",
        connected: false,
      },
      500
    );
  }
});

// User synchronization endpoint
app.post("/api/users/sync", async (c) => {
  try {
    const supabase = c.get("supabase");
    const { id, email, firstName, lastName, imageUrl } = await c.req.json();

    // Check if user already exists
    const { data: existingUser, error: searchError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", id)
      .single();

    if (searchError && searchError.code !== "PGRST116") {
      // PGRST116 = not found
      throw searchError;
    }

    if (existingUser) {
      // Update existing user
      const { data, error } = await supabase
        .from("users")
        .update({
          email,
          first_name: firstName,
          last_name: lastName,
          avatar_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("clerk_id", id)
        .select()
        .single();

      if (error) throw error;

      return c.json({
        success: true,
        message: "User updated successfully",
        user: data,
      });
    } else {
      // Create new user
      const { data, error } = await supabase
        .from("users")
        .insert({
          clerk_id: id,
          email,
          first_name: firstName,
          last_name: lastName,
          avatar_url: imageUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return c.json({
        success: true,
        message: "User created successfully",
        user: data,
      });
    }
  } catch (error) {
    console.error("Error syncing user:", error);
    return c.json(
      {
        success: false,
        message: "Failed to sync user",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

app.post("/api/generate-questions", async (c) => {
  try {
    const { content, numQuestions = 10, userId, filename } = await c.req.json();
    const authHeader = c.req.header('Authorization');
    
    if (!userId || !authHeader) {
      return c.json({
        success: false,
        message: "User ID and authorization token are required",
      }, 400);
    }

    // Usar el cliente de Supabase del contexto
    const supabase = c.get("supabase");
    
    // Obtener el ID de Supabase del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (userError || !userData) {
      console.error("Error getting user:", userError);
      return c.json({
        success: false,
        message: "User not found in database",
      }, 404);
    }

    const prompt = {
      role: "system",
      content: `
    You are an expert MCQ (multiple-choice question) creation assistant. You MUST respond with valid JSON only.

When given:
1. A number N (desired number of questions)
2. A block of text called TEXT (extracted from a PDF)

RESPONSE REQUIREMENTS:
- You MUST respond with a valid JSON object
- The response will be automatically parsed as JSON
- NO additional text, explanations, or formatting allowed
- Follow the exact schema specified below

REQUIRED JSON SCHEMA:
{
  "questions": [
    {
      "question": "string - the question text",
      "options": {
        "A": "string - option A text", 
        "B": "string - option B text",
        "C": "string - option C text", 
        "D": "string - option D text"
      },
      "answer": "string - single letter A, B, C, or D",
      "explanation": "string - 1-2 sentence justification"
    }
  ]
}

CONTENT RULES:
- Generate exactly N questions based ONLY on TEXT content
- Each question tests comprehension of concepts from TEXT
- Create four distinct, plausible options with ONE correct answer
- Ensure correct answer is definitively supported by TEXT
- Write clear explanations referencing TEXT information
- Test different concepts (avoid repetition)
- If insufficient TEXT content, use: {"question": "Insufficient information", "options": {"A": "Unknown", "B": "Unknown", "C": "Unknown", "D": "Unknown"}, "answer": "A", "explanation": "Insufficient source material"}

JSON VALIDATION REQUIREMENTS:
- All property names must use double quotes
- All string values must use double quotes  
- Properly escape internal quotes with backslash
- No trailing commas
- No comments or extra formatting
- Valid JSON syntax throughout
    `,
    };

    const userMessage = {
      role: "user",
      content: ` N: ${numQuestions} GENERATE EXACTLY THIS AMOUNT OF QUESTIONS,
                 TEXT: ${content}`,
    };

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${c.env.OPENROUTER_API_KEY}`,
          /*         "HTTP-Referer": "https://study-ai-plan.luisramirezhernandez1.workers.dev",
        "X-Title": "EasyStudy AI", */
        },
        body: JSON.stringify({
          model: "google/gemma-3n-e4b-it",
          messages: [prompt, userMessage],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 3000,
          top_p: 0.9,
          stream: false,
        }),
      }
    );

    const responseData: any = await response.json();

    if (!response.ok) {
      console.error("API Error Response:", responseData);
      throw new Error(responseData.message || "Failed to generate questions");
    }

    const data = responseData;
    console.log(data, "data");
    let questions;

    try {
      // Verificar que tenemos la estructura esperada
      if (!data.choices?.[0]?.message?.content) {
        console.error("Unexpected API response structure:", data);
        throw new Error("Invalid API response structure");
      }

              let responseText = data.choices[0].message.content;
        console.log("Raw API response length:", responseText.length);

        // Verificar si la respuesta está vacía o es inválida
        if (!responseText || typeof responseText !== 'string') {
          throw new Error('Invalid or empty response from API');
        }

        // Función para validar JSON
        const isValidJSON = (str: string) => {
          try {
            JSON.parse(str);
            return true;
          } catch (e) {
            return false;
          }
        };

        // Limpiar y validar el texto
        const cleanText = (text: string) => {
          // Eliminar marcadores de código y espacios
          let cleaned = text
            .replace(/^[\s\n]*```(?:json)?[\s\n]*/, '')
            .replace(/[\s\n]*```[\s\n]*$/, '')
            .trim();

          // Asegurarse de que todas las comillas estén correctamente escapadas
          cleaned = cleaned
            .replace(/\\"/g, '_QUOTE_') // Preservar comillas ya escapadas
            .replace(/(?<!\\)"/g, '\\"') // Escapar comillas no escapadas
            .replace(/_QUOTE_/g, '\\"'); // Restaurar comillas preservadas

          // Asegurarse de que el JSON comienza y termina correctamente
          if (!cleaned.startsWith('{')) cleaned = '{' + cleaned;
          if (!cleaned.endsWith('}')) cleaned = cleaned + '}';

          return cleaned;
        };

        // Primer intento: limpiar básico
        responseText = cleanText(responseText);
        console.log("After basic cleanup, length:", responseText.length);

        try {
          if (isValidJSON(responseText)) {
            questions = JSON.parse(responseText);
            console.log("Parsed JSON successfully on first try");
          } else {
            // Segundo intento: limpieza más agresiva
            responseText = responseText
              .replace(/[\u2018\u2019]/g, "'")
              .replace(/[\u201C\u201D]/g, '"')
              .replace(/\n/g, ' ')
              .replace(/\s+/g, ' ')
              .replace(/\\/g, '\\\\')
              .replace(/(?<!\\)"/g, '\\"')
              .trim();

            console.log("After aggressive cleanup, length:", responseText.length);
            questions = JSON.parse(responseText);
            console.log("Parsed JSON successfully after aggressive cleanup");
          }

        // Validar la estructura del JSON parseado
        if (!questions.questions || !Array.isArray(questions.questions)) {
          throw new Error("Invalid questions format");
        }

        console.log("Successfully parsed questions:", questions);
      } catch (parseError) {
          console.error("Initial JSON Parse Error:", parseError);
          
          // Limpiar el texto más agresivamente
          const cleanedText = responseText
            .replace(/[\u2018\u2019]/g, "'") // Reemplazar comillas simples curvas
            .replace(/[\u201C\u201D]/g, '"') // Reemplazar comillas dobles curvas
            .replace(/\n\s*\n/g, '\n') // Eliminar líneas vacías múltiples
            .replace(/\s+/g, ' ') // Normalizar espacios
            .replace(/\\/g, '') // Eliminar backslashes
            .trim();

          console.log("Attempting to parse cleaned text:", cleanedText);
          questions = JSON.parse(cleanedText);
          console.log("Successfully parsed cleaned JSON");
      }
    } catch (error) {
      console.error("Error processing AI response:", error);
      questions = {
        questions: [
          {
            question: "Error generating questions",
            options: {
              A: "Error",
              B: "Error",
              C: "Error",
              D: "Error",
            },
            answer: "A",
            explanation:
              "There was an error generating the questions. Please try again.",
          },
        ],
      };
    }

    // Crear un nuevo quiz y guardar las preguntas
    try {
      // 1. Crear el quiz
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          user_id: userData.id,
          title: `Quiz ${filename}`,
          description: "Quiz generado automáticamente",
          source_content: content.substring(0, 1000), // Limitamos el tamaño del contenido
          metadata: {
            model: data.model,
            usage: data.usage,
            numQuestions
          }
        })
        .select()
        .single();

      if (quizError) {
        console.error("Error creating quiz:", quizError);
        return c.json({
          success: false,
          message: "Failed to create quiz",
          error: quizError.message
        }, 500);
      }

      // 2. Guardar las preguntas asociadas al quiz
      const questionsToInsert = questions.questions.map((q: any) => ({
        quiz_id: quiz.id,
        question: q.question,
        options: q.options,
        correct_answer: q.answer,
        explanation: q.explanation,
        created_at: new Date().toISOString()
      }));

      const { data: savedQuestions, error: insertError } = await supabase
        .from("questions")
        .insert(questionsToInsert)
        .select();

      if (insertError) {
        console.error("Error saving questions:", insertError);
        // Si falla al guardar las preguntas, eliminar el quiz creado
        await supabase.from("quizzes").delete().eq("id", quiz.id);
        return c.json({
          success: false,
          message: "Failed to save questions in database",
          error: insertError.message
        }, 500);
      }

      return c.json({
        success: true,
        message: "Quiz and questions created successfully",
        quiz,
        questions: savedQuestions,
        metadata: {
          numQuestions,
          model: data.model,
          usage: data.usage,
        },
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return c.json({
        success: true,
        message: "Questions generated but not saved",
        questions: questions.questions,
        metadata: {
          numQuestions,
          model: data.model,
          usage: data.usage,
        },
        dbError: dbError instanceof Error ? dbError.message : "Unknown database error"
      });
    }
  } catch (error) {
    console.error("Error in generate-questions:", error);
    return c.json(
      {
        success: false,
        message: "Failed to generate questions",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Endpoint para obtener todos los quizzes de un usuario
app.get("/api/quizzes", async (c) => {
  try {
    const userId = c.req.query('userId');
    
    if (!userId) {
      return c.json({
        success: false,
        message: "User ID is required",
      }, 400);
    }

    const supabase = c.get("supabase");
    
    // Obtener el ID de Supabase del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (userError || !userData) {
      console.error("Error getting user:", userError);
      return c.json({
        success: false,
        message: "User not found in database",
      }, 404);
    }

    // Obtener los quizzes con sus preguntas
    const { data: quizzes, error: quizzesError } = await supabase
      .from("quizzes")
      .select(`
        *,
        questions (*)
      `)
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false });

    if (quizzesError) {
      console.error("Error fetching quizzes:", quizzesError);
      return c.json({
        success: false,
        message: "Failed to fetch quizzes",
        error: quizzesError.message
      }, 500);
    }

    return c.json({
      success: true,
      quizzes
    });
  } catch (error) {
    console.error("Error in get quizzes:", error);
    return c.json({
      success: false,
      message: "Failed to fetch quizzes",
      error: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Endpoint para obtener un quiz específico con sus preguntas
app.get("/api/quizzes/:id", async (c) => {
  try {
    const quizId = c.req.param('id');
    const supabase = c.get("supabase");
    
    const { data: quiz, error } = await supabase
      .from("quizzes")
      .select(`
        *,
        questions (*)
      `)
      .eq('id', quizId)
      .single();

    if (error) {
      console.error("Error fetching quiz:", error);
      return c.json({
        success: false,
        message: "Failed to fetch quiz",
        error: error.message
      }, 500);
    }

    return c.json({
      success: true,
      quiz
    });
  } catch (error) {
    console.error("Error in get quiz:", error);
    return c.json({
      success: false,
      message: "Failed to fetch quiz",
      error: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

export default app;
