import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoCloudUploadOutline,
  IoCheckmarkCircle,
  IoArrowForward,
} from "react-icons/io5";
import { IoBulb } from "react-icons/io5";
import {
  LuBrain,
  LuTarget,
  LuFileText,
  LuBookOpen,
  LuLogIn,
} from "react-icons/lu";
import pdfToText from "react-pdftotext";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
  useAuth,
} from "@clerk/clerk-react";

function LandingPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [generatedQuizId, setGeneratedQuizId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();

  const extractTextFromPDF = async (file: File) => {
    try {
      const text = await pdfToText(file);
      console.log("📄 Contenido del PDF extraído:");
      console.log("=====================================");
      console.log(`📁 Nombre del archivo: ${file.name}`);
      console.log(
        `📏 Tamaño del archivo: ${(file.size / 1024 / 1024).toFixed(2)} MB`
      );
      console.log(`📝 Contenido del texto:`);
      console.log(file);
      console.log("=====================================");
      await generateQuestions(text, file.name);
    } catch (error) {
      console.error("❌ Error al extraer texto del PDF:", error);
      return null;
    }
  };

  const generateQuestions = async (text: string, filename: string) => {
    setIsGenerating(true);
    setError(null);
    
    try {
      if (!user) {
        throw new Error("Usuario no autenticado");
      }

      const token = await getToken();

      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: text,
          numQuestions: 10,
          userId: user.id,
          filename
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Error al generar preguntas");
      }

      console.log("✅ Preguntas generadas y guardadas:", data);
      setGeneratedQuizId(data.quiz.id);
      return data.questions;
    } catch (error) {
      console.error("❌ Error:", error);
      setError(error instanceof Error ? error.message : "Error desconocido");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const processFile = async (file: File) => {
    if (file.type === "application/pdf") {
      try {
        setIsUploading(true);
        setError(null);
        setUploadedFile(file);
        
        // Extraer texto del PDF
        await extractTextFromPDF(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al procesar el archivo");
        setUploadedFile(null);
      } finally {
        setIsUploading(false);
      }
    } else {
      setError("Solo se permiten archivos PDF");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Navigation */}
        <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <LuBookOpen className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">
                  EasyStudy
                </span>
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <a
                  href="#features"
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Características
                </a>
                <a
                  href="#how-it-works"
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Cómo funciona
                </a>
                <a
                  href="#pricing"
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Precios
                </a>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      Iniciar sesión
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <UserButton
                    afterSwitchSessionUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "w-10 h-10",
                      },
                    }}
                  />
                </SignedIn>
              </div>

              {/* Botón para móviles */}
              <div className="flex md:hidden items-center">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      <LuLogIn className="h-4 w-4 text-white" />
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <UserButton
                    afterSwitchSessionUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "w-10 h-10",
                      },
                    }}
                  />
                </SignedIn>
              </div>
            </div>
          </div>
        </nav>
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Convierte tus <span className="text-blue-600">PDFs</span> en
                <br />
                <span className="text-primary ">exámenes</span> inteligentes
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Sube cualquier documento PDF y nuestro sistema de IA extraerá
                automáticamente el contenido para generar preguntas
                personalizadas que te ayuden a preparar tus exámenes de manera
                eficiente.
              </p>

              {/* File Upload Area - Solo para usuarios autenticados */}
              <SignedIn>
                <div className="max-w-2xl mx-auto mb-8">
                  {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                      {error}
                    </div>
                  )}

                  <div
                    className={`mb-4 border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                      isUploading || isGenerating
                        ? "border-purple-700 bg-primary-50"
                        : "border-gray-300 hover:border-purple-700 hover:bg-gray-50"
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    {isUploading || isGenerating ? (
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mb-4"></div>
                        <p className="text-lg font-medium text-gray-900">
                          {isUploading ? "Procesando tu PDF..." : "Generando preguntas..."}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          {isUploading ? "Esto puede tomar unos segundos" : "La IA está analizando el contenido"}
                        </p>
                      </div>
                    ) : !uploadedFile ? (
                      <div>
                        <IoCloudUploadOutline className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">
                          Arrastra tu PDF aquí o haz clic para seleccionar
                        </p>
                        <p className="text-gray-500 mb-4">
                          Soporta archivos PDF de hasta 10MB
                        </p>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors cursor-pointer inline-block"
                        >
                          Seleccionar archivo
                        </label>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-4">
                        <IoCheckmarkCircle className="h-8 w-8 text-green-500" />
                        <div className="text-left">
                          <p className="font-medium text-gray-900">
                            {uploadedFile.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {generatedQuizId ? "¡Quiz generado correctamente!" : "Archivo procesado correctamente"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {uploadedFile && !isGenerating && (
                    <button
                      onClick={() => {
                        if (generatedQuizId) {
                          navigate(`/quiz/${generatedQuizId}`);
                        } else {
                          extractTextFromPDF(uploadedFile);
                        }
                      }}
                      className={`px-8 py-3 rounded-lg transition-colors flex items-center space-x-2 mx-auto ${
                        generatedQuizId 
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                      disabled={isGenerating}
                    >
                      {generatedQuizId ? (
                        <>
                          <IoBulb className="h-5 w-5" />
                          <span>Ir al Quiz</span>
                          <IoArrowForward className="h-5 w-5" />
                        </>
                      ) : (
                        <>
                          <IoBulb className="h-5 w-5" />
                          <span>Generar preguntas de examen</span>
                          <IoArrowForward className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </SignedIn>

              {/* Mensaje para usuarios no autenticados */}
              <SignedOut>
                <div className="max-w-2xl mx-auto mb-8">
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50">
                    <IoCloudUploadOutline className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Inicia sesión para subir tus PDFs
                    </p>
                    <p className="text-gray-500 mb-4">
                      Crea una cuenta gratuita para comenzar a generar preguntas
                      de examen
                    </p>
                    <div className="space-x-4">
                      <SignInButton mode="modal">
                        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                          Iniciar sesión
                        </button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
                          Crear cuenta
                        </button>
                      </SignUpButton>
                    </div>
                  </div>
                </div>
              </SignedOut>
            </div>
          </div>
        </section>

        <section id="features" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Características principales
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Todo lo que necesitas para convertir tus documentos en
                herramientas de estudio efectivas
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LuFileText className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Extracción inteligente
                </h3>
                <p className="text-gray-600">
                  Nuestra IA extrae automáticamente el contenido relevante de
                  tus PDFs, identificando conceptos clave y temas importantes.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LuBrain className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Generación de preguntas
                </h3>
                <p className="text-gray-600">
                  Crea automáticamente preguntas de diferentes tipos: opción
                  múltiple, verdadero/falso, y preguntas abiertas.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LuTarget className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Personalización
                </h3>
                <p className="text-gray-600">
                  Adapta las preguntas a tu nivel de dificultad y estilo de
                  aprendizaje preferido.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Cómo funciona
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Tres pasos simples para transformar tus documentos en exámenes
                efectivos
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Sube tu PDF
                </h3>
                <p className="text-gray-600">
                  Simplemente arrastra y suelta tu archivo PDF o selecciónalo
                  desde tu dispositivo.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-2xl font-bold text-blue-600">2</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Procesamiento IA
                </h3>
                <p className="text-gray-600">
                  Nuestro sistema analiza el contenido y extrae los conceptos
                  más importantes.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-2xl font-bold text-blue-600">3</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Genera preguntas
                </h3>
                <p className="text-gray-600">
                  Obtén un conjunto personalizado de preguntas para practicar y
                  evaluar tu conocimiento.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-blue-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-white mb-2">
                  10,000+
                </div>
                <div className="text-blue-100">PDFs procesados</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-white mb-2">
                  50,000+
                </div>
                <div className="text-blue-100">Preguntas generadas</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-white mb-2">95%</div>
                <div className="text-blue-100">Satisfacción de usuarios</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              ¿Listo para mejorar tu estudio?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Únete a miles de estudiantes que ya están usando StudyAI para
              preparar sus exámenes de manera más eficiente.
            </p>
            <button className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold">
              Comenzar gratis
            </button>
          </div>
        </section>

        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <LuBookOpen className="h-6 w-6 text-primary-400" />
                  <span className="text-xl font-bold">EasyStudy</span>
                </div>
                <p className="text-gray-400">
                  Transformando la manera en que estudias con inteligencia
                  artificial.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Producto</h3>
                <ul className="space-y-2 text-gray-400">
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Características
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Precios
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      API
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Soporte</h3>
                <ul className="space-y-2 text-gray-400">
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Centro de ayuda
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Contacto
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Documentación
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Legal</h3>
                <ul className="space-y-2 text-gray-400">
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Privacidad
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Términos
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Cookies
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2025 EasyStudy. Todos los derechos reservados.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default LandingPage;
