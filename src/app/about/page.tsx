import Nav from '../nav';
import Footer from '../footer';

export default function AboutPage() {
  return (
    <>
      <Nav />
      <section className="bgm-section about-section" style={{ minHeight: '100vh', paddingTop: '8rem' }}>
        <p className="section-label">Who We Are</p>
        <h2 className="section-title">The BGM Experience</h2>
        <div className="section-divider" />
        <div className="about-grid">
          <div className="about-card">
            <span className="about-icon">♟</span>
            <h3>Strategy</h3>
            <p>From Eurogames to war games, we celebrate deep strategic thinking and elegant game design.</p>
          </div>
          <div className="about-card">
            <span className="about-icon">🏆</span>
            <h3>Competition</h3>
            <p>Monthly tournaments, seasonal leagues, and championship finals with prizes and glory.</p>
          </div>
          <div className="about-card">
            <span className="about-icon">🤝</span>
            <h3>Community</h3>
            <p>A warm, inclusive table for everyone — beginners welcome, veterans celebrated.</p>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
