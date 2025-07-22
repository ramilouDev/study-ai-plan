import { useNavigate, useParams } from "react-router-dom";
import { SignedIn, UserButton, useAuth, useUser } from "@clerk/clerk-react";
import { IoArrowBack, IoCheckmarkCircle } from "react-icons/io5";
import { LuBrain, LuTarget } from "react-icons/lu";
import { useEffect, useState } from "react";

// Definir interfaces para los tipos de datos
interface Question {
  id: string;
  quiz_id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: string;
  explanation: string;
  created_at: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  source_content: string;
  created_at: string;
  user_id: string;
  questions: Question[];
}

export default function QuizPage() {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const { user } = useUser();
  const { getToken } = useAuth();
  
  // Estados para manejar el quiz
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  // Cargar el quiz
  useEffect(() => {
    const fetchQuiz = async () => {
      if (!quizId || !user) {
        setError('Debes iniciar sesión para ver este quiz');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const token = await getToken();
        
        // Primero, obtener el ID de Supabase del usuario actual
        const userResponse = await fetch(`/api/users/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            id: user.id,
            email: user.emailAddresses[0]?.emailAddress,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl
          })
        });

        if (!userResponse.ok) {
          throw new Error('Error al verificar el usuario');
        }

        const userData = await userResponse.json();
        
        // Obtener el quiz
        const response = await fetch(`/api/quizzes/${quizId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Error al cargar el quiz');
        }
        
        const data = await response.json();
        
        if (!data.success || !data.quiz) {
          throw new Error('Quiz no encontrado');
        }

        // Verificar si el usuario es el creador del quiz
        if (data.quiz.user_id !== userData.user.id) {
          throw new Error('No tienes permiso para ver este quiz');
        }
        
        setQuiz(data.quiz);
      } catch (err) {
        console.error('Error cargando el quiz:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
        // Si hay un error de permisos, redirigir al inicio después de 2 segundos
        if (err instanceof Error && err.message === 'No tienes permiso para ver este quiz') {
          setTimeout(() => {
            navigate('/');
          }, 2000);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuiz();
  }, [quizId, user, getToken, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-blue-100">
      {/* Header */}
      <header className="flex justify-between items-center p-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <IoArrowBack className="text-xl" />
          Volver al inicio
        </button>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
            <p className="text-lg text-gray-600">Cargando quiz...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-red-500 text-xl mb-4">Error: {error}</div>
            <button 
              onClick={() => navigate('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Volver al inicio
            </button>
          </div>
        ) : quiz ? (
          <>
            <div className="text-center mb-12">
              <div className="flex justify-center items-center gap-3 mb-4">
                <LuBrain className="text-4xl text-blue-600" />
                <h1 className="text-4xl font-bold text-gray-800">{quiz.title}</h1>
              </div>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                {quiz.description || '¡Bienvenido al quiz! Pon a prueba tus conocimientos con preguntas generadas automáticamente.'}
              </p>
            </div>

            {!showResults ? (
              // Mostrar preguntas
              <>
                {quiz.questions && quiz.questions.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                    <div className="flex items-center gap-3 mb-6">
                      <LuTarget className="text-2xl text-purple-600" />
                      <h2 className="text-2xl font-semibold text-gray-800">
                        Pregunta {currentQuestionIndex + 1} de {quiz.questions.length}
                      </h2>
                    </div>

                    <div className="mb-8">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">
                        {quiz.questions[currentQuestionIndex]?.question}
                      </h3>
                      
                      <div className="space-y-3">
                        {quiz.questions[currentQuestionIndex]?.options && 
                          Object.entries(quiz.questions[currentQuestionIndex].options).map(([key, value]) => (
                            <button
                              key={key}
                              className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                                selectedAnswers[quiz.questions[currentQuestionIndex].id] === key
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                              }`}
                              onClick={() => {
                                setSelectedAnswers({
                                  ...selectedAnswers,
                                  [quiz.questions[currentQuestionIndex].id]: key
                                });
                              }}
                            >
                              <span className="flex items-center gap-3">
                                <span className={`w-6 h-6 border-2 rounded-full flex items-center justify-center text-sm font-medium ${
                                  selectedAnswers[quiz.questions[currentQuestionIndex].id] === key
                                    ? 'border-blue-500 text-blue-500'
                                    : 'border-gray-300'
                                }`}>
                                  {key}
                                </span>
                                {value}
                              </span>
                            </button>
                          ))
                        }
                      </div>
                      {/* Mensaje de validación */}
                      {!selectedAnswers[quiz.questions[currentQuestionIndex].id] && (
                        <div className="mt-4 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Selecciona una respuesta para continuar
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <button 
                        className={`px-6 py-2 font-medium ${
                          currentQuestionIndex > 0 
                            ? 'text-gray-600 hover:text-gray-800' 
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
                        onClick={() => {
                          if (currentQuestionIndex > 0) {
                            setCurrentQuestionIndex(currentQuestionIndex - 1);
                          }
                        }}
                        disabled={currentQuestionIndex === 0}
                      >
                        Anterior
                      </button>
                      
                      {currentQuestionIndex < quiz.questions.length - 1 ? (
                        <button 
                          className={`px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors ${
                            selectedAnswers[quiz.questions[currentQuestionIndex].id]
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-gray-300 cursor-not-allowed text-gray-600'
                          }`}
                          onClick={() => {
                            if (selectedAnswers[quiz.questions[currentQuestionIndex].id]) {
                              setCurrentQuestionIndex(currentQuestionIndex + 1);
                            }
                          }}
                          disabled={!selectedAnswers[quiz.questions[currentQuestionIndex].id]}
                          title={!selectedAnswers[quiz.questions[currentQuestionIndex].id] ? "Debes seleccionar una respuesta para continuar" : ""}
                        >
                          Siguiente
                          <IoCheckmarkCircle />
                        </button>
                      ) : (
                        <button 
                          className={`px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors ${
                            selectedAnswers[quiz.questions[currentQuestionIndex].id]
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-gray-300 cursor-not-allowed text-gray-600'
                          }`}
                          onClick={() => {
                            if (selectedAnswers[quiz.questions[currentQuestionIndex].id]) {
                              setShowResults(true);
                            }
                          }}
                          disabled={!selectedAnswers[quiz.questions[currentQuestionIndex].id]}
                          title={!selectedAnswers[quiz.questions[currentQuestionIndex].id] ? "Debes seleccionar una respuesta para ver los resultados" : ""}
                        >
                          Ver resultados
                          <IoCheckmarkCircle />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">Progreso</span>
                    <span className="text-sm font-medium text-blue-600">
                      {currentQuestionIndex + 1}/{quiz.questions?.length || 0}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${((currentQuestionIndex + 1) / (quiz.questions?.length || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </>
            ) : (
              // Mostrar resultados
              <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-center mb-6">Resultados del Quiz</h2>
                
                <div className="mb-8">
                  {quiz.questions.map((question, index) => {
                    const isCorrect = selectedAnswers[question.id] === question.correct_answer;
                    
                    return (
                      <div key={question.id} className="mb-8 border-b pb-6">
                        <div className="flex items-start gap-3 mb-2">
                          <span className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                            isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {index + 1}
                          </span>
                          <div>
                            <h3 className="text-lg font-medium">{question.question}</h3>
                            <div className="mt-3 space-y-2">
                              {Object.entries(question.options).map(([key, value]) => (
                                <div 
                                  key={key} 
                                  className={`p-3 rounded-lg ${
                                    key === question.correct_answer
                                      ? 'bg-green-50 border border-green-200'
                                      : key === selectedAnswers[question.id] && key !== question.correct_answer
                                        ? 'bg-red-50 border border-red-200'
                                        : 'bg-gray-50 border border-gray-200'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                                      key === question.correct_answer
                                        ? 'bg-green-500 text-white'
                                        : key === selectedAnswers[question.id] && key !== question.correct_answer
                                          ? 'bg-red-500 text-white'
                                          : 'bg-gray-300 text-gray-700'
                                    }`}>
                                      {key}
                                    </span>
                                    {value}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 text-sm bg-blue-50 p-3 rounded-lg">
                              <strong className="text-blue-700">Explicación:</strong> {question.explanation}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex justify-center">
                  <button 
                    onClick={() => navigate('/')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Volver al inicio
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-lg text-gray-600">No se encontró el quiz</p>
            <button 
              onClick={() => navigate('/')}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Volver al inicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

