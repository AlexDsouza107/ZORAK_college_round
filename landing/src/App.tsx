import AmbientGlow from './effects/AmbientGlow';
import BubbleField from './effects/BubbleField';
import ScrollProgress from './effects/ScrollProgress';
import SmoothScroll from './effects/SmoothScroll';
import Features from './sections/Features';
import Footer from './sections/Footer';
import Hero from './sections/Hero';
import HowItWorks from './sections/HowItWorks';
import Nav from './sections/Nav';
import Playground from './sections/Playground';
import Stats from './sections/Stats';

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-canvas">
      <SmoothScroll />
      <ScrollProgress />
      <AmbientGlow />
      <BubbleField />
      <a href="#how" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-canvas">Skip to content</a>
      <Nav />
      <main className="relative z-10">
        <Hero />
        <Stats />
        <HowItWorks />
        <Playground />
        <Features />
      </main>
      <div className="relative z-10"><Footer /></div>
    </div>
  );
}
