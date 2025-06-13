import React from 'react';

// Main application component
function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-inter">
      {/* Navigation Bar */}
      <header className="bg-gray-800 shadow-lg py-4">
        <nav className="container mx-auto flex justify-between items-center px-4">
          <a href="#" className="text-3xl font-bold text-green-400">
            La Cancha del Deto
          </a>
          <ul className="flex space-x-6">
            <li>
              <a href="#inicio" className="hover:text-green-400 transition-colors duration-300">
                Inicio
              </a>
            </li>
            <li>
              <a href="#noticias" className="hover:text-green-400 transition-colors duration-300">
                Noticias
              </a>
            </li>
            <li>
              <a href="#acerca-de" className="hover:text-green-400 transition-colors duration-300">
                Acerca de
              </a>
            </li>
            <li>
              <a href="#contacto" className="hover:text-green-400 transition-colors duration-300">
                Contacto
              </a>
            </li>
          </ul>
        </nav>
      </header>

      {/* Hero Section */}
      <section id="inicio" className="relative h-[60vh] md:h-[70vh] bg-cover bg-center" style={{ backgroundImage: "url('https://placehold.co/1920x1080/0d1117/4CAF50?text=Estadio+de+Fútbol')" }}>
        <div className="absolute inset-0 bg-black opacity-60"></div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4 animate-fade-in-down">
            Tu Fuente Número Uno de Información sobre Fútbol
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 animate-fade-in-up">
            Noticias actualizadas, análisis profundos y todo lo que necesitas saber del deporte más hermoso.
          </p>
          <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition-all duration-300 hover:scale-105 animate-bounce-in">
            Explora las Noticias
          </button>
        </div>
      </section>

      {/* Recent News Section */}
      <section id="noticias" className="py-16 bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-green-400 mb-12 animate-fade-in">
            Noticias Recientes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* News Article 1 */}
            <ArticleCard
              title="El Real Madrid gana la Liga de Campeones"
              description="Un análisis detallado de cómo el Real Madrid se alzó con su 15ª Liga de Campeones, destacando momentos clave y actuaciones individuales."
              imageUrl="https://placehold.co/400x250/0d1117/4CAF50?text=Real+Madrid+Campeón"
            />
            {/* News Article 2 */}
            <ArticleCard
              title="Messi hace historia en la MLS"
              description="Lionel Messi rompe otro récord en la Major League Soccer, consolidando su legado en el fútbol estadounidense."
              imageUrl="https://placehold.co/400x250/0d1117/4CAF50?text=Messi+MLS"
            />
            {/* News Article 3 */}
            <ArticleCard
              title="El impacto de la nueva regla del fuera de juego"
              description="Expertos debaten sobre cómo la reciente modificación en la regla del fuera de juego está afectando el desarrollo del juego."
              imageUrl="https://placehold.co/400x250/0d1117/4CAF50?text=Regla+Fuera+de+Juego"
            />
            {/* News Article 4 */}
            <ArticleCard
              title="Jóvenes talentos que debes seguir en 2025"
              description="Una lista de los futbolistas emergentes que están causando sensación y prometen un futuro brillante en el fútbol mundial."
              imageUrl="https://placehold.co/400x250/0d1117/4CAF50?text=Jóvenes+Talentos"
            />
            {/* News Article 5 */}
            <ArticleCard
              title="Análisis táctico: La revolución del 4-3-3 moderno"
              description="Profundizamos en las variantes y adaptaciones del popular esquema 4-3-3, y su eficacia en el fútbol actual."
              imageUrl="https://placehold.co/400x250/0d1117/4CAF50?text=Análisis+Táctico"
            />
            {/* News Article 6 */}
            <ArticleCard
              title="Grandes regresos: Jugadores que volvieron a su mejor nivel"
              description="Historias inspiradoras de futbolistas que superaron adversidades y retomaron su forma élite después de periodos difíciles."
              imageUrl="https://placehold.co/400x250/0d1117/4CAF50?text=Grandes+Regresos"
            />
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="acerca-de" className="bg-gray-800 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-green-400 mb-8 animate-fade-in">
            Acerca de La Cancha del Deto
          </h2>
          <p className="text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed animate-fade-in-up">
            Somos un equipo de apasionados por el fútbol, dedicados a traerte la información más
            precisa, el análisis más profundo y las historias más emocionantes del deporte rey.
            Desde los resultados de última hora hasta las estrategias tácticas más complejas,
            "La Cancha del Deto" es tu destino único para todo lo relacionado con el fútbol.
            Nuestra misión es mantenerte informado y entretenido con contenido de alta calidad
            que resuene con tu amor por el deporte.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer id="contacto" className="bg-gray-800 py-8 border-t border-gray-700">
        <div className="container mx-auto text-center px-4">
          <p className="text-gray-400 mb-4">
            © {new Date().getFullYear()} La Cancha del Deto. Todos los derechos reservados.
          </p>
          <div className="flex justify-center space-x-6 mb-4">
            <a href="#" className="text-gray-400 hover:text-green-400 transition-colors duration-300">
              {/* Facebook Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-facebook"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-green-400 transition-colors duration-300">
              {/* Twitter Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-twitter"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17-19 11.6 2.2.1 4.4-.6 6-2 1.1-.9 1.8-2.2 2-3.5-.3.1-.7.1-1 .1-1.3 0-2.6-.5-3.8-1.6C4.1 11.4 5 10.3 5 10c-2-.2-4 1.1-4 1.1C1.3 14 2 16.3 2 16.3s1.5 2.8 5.7 4.5c.7.2 1.5.3 2.2.3 8.3 0 10.4-6.9 10.4-12.2 0-.2 0-.4-.1-.5 1.1-.9 2-2.1 2.5-3.3z"/></svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-green-400 transition-colors duration-300">
              {/* Instagram Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-instagram"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
          </div>
          <p className="text-gray-500 text-sm">
            Para consultas, contáctanos en info@lacanchadeldeto.com
          </p>
        </div>
      </footer>
    </div>
  );
}

// Article Card Component (for news)
function ArticleCard({ title, description, imageUrl }) {
  return (
    <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden transform transition-transform duration-300 hover:scale-105 animate-fade-in-up">
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-48 object-cover rounded-t-lg"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = "https://placehold.co/400x250/0d1117/4CAF50?text=Imagen+No+Disponible";
        }}
      />
      <div className="p-6">
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-300 text-sm mb-4">{description}</p>
        <button className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-full text-sm transition-colors duration-300">
          Leer más
        </button>
      </div>
    </div>
  );
}

export default App;
