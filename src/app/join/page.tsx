import Nav from '../nav';

export default function JoinPage() {
  return (
    <>
      <Nav />
      <section className="bgm-section join-section" style={{ minHeight: '100vh', paddingTop: '8rem' }}>
        <p className="section-label">Membership</p>
        <h2 className="section-title">Join the Table</h2>
        <div className="section-divider" />
        <p className="join-desc">
          Stay informed on events, tournaments, and game nights across Melbourne. All are welcome.
        </p>
        <div className="join-form">
          <input type="email" placeholder="Your email address…" />
          <button type="button">JOIN</button>
        </div>
      </section>
      <footer className="bgm-footer">
        <div className="footer-logo">BGM</div>
        <div className="footer-copy">© 2026 Boardgame in Melbourne. All rights reserved.</div>
        <div className="footer-links">
          <a href="#">Instagram</a>
          <a href="#">Discord</a>
          <a href="#">Meetup</a>
        </div>
      </footer>
    </>
  );
}
