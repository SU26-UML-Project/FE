import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import Templates from './components/Templates'
import Footer from './components/Footer'

function App() {
  return (
    <div className="min-h-screen grid-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Templates />
      </main>
      <Footer />
    </div>
  )
}

export default App
