import Features from './sections/Features';
import Footer from './sections/Footer';
import Hero from './sections/Hero';
import HowItWorks from './sections/HowItWorks';
import Nav from './sections/Nav';
import Playground from './sections/Playground';
import Stats from './sections/Stats';

export default function App() {
  return (
    <div className="min-h-screen overflow-x-clip bg-alabaster-100">
      <a href="#how" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      <Nav />
      <main>
        <Hero />
        <Stats />
        <HowItWorks />
        <Playground />
        <Features />
      </main>
      <Footer />
    </div>
  );
}
