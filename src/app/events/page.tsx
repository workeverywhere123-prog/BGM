import Nav from '../nav';
import Footer from '../footer';

const EVENTS = [
  { day: '26', month: 'APR', title: 'Spring League — Round 4', sub: 'Twilight Imperium · Box Hill Community Hall', badge: 'OPEN' },
  { day: '03', month: 'MAY', title: "Beginner's Night", sub: 'Gateway Games · Fitzroy Library', badge: 'FREE' },
  { day: '17', month: 'MAY', title: 'Championship Semi-Finals', sub: 'Catan · Brass · Spirit Island · CBD Venue', badge: 'INVITE' },
  { day: '07', month: 'JUN', title: 'Winter Grand Final 2026', sub: 'All Games · Crown Palladium, Melbourne', badge: 'FINALE' },
];

export default function EventsPage() {
  return (
    <>
      <Nav />
      <section className="bgm-section events-section" style={{ minHeight: '100vh', paddingTop: '8rem' }}>
        <p className="section-label">Upcoming</p>
        <h2 className="section-title">Events &amp; Gatherings</h2>
        <div className="section-divider" />
        <div className="events-list">
          {EVENTS.map((e) => (
            <div key={e.title} className="event-item">
              <div className="event-date">
                <div className="event-day">{e.day}</div>
                <div className="event-month">{e.month}</div>
              </div>
              <div className="event-info">
                <h4>{e.title}</h4>
                <p>{e.sub}</p>
              </div>
              <div className="event-badge">{e.badge}</div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </>
  );
}
