import { useStore } from './store';

export default function Intro() {
  const { phase, setPhase, setMode, sound, setSound } = useStore();
  if (phase === 'app') return null;
  const entering = phase === 'enter';
  const go = () => { setPhase('enter'); setMode('enter'); };
  return (
    <div className={`intro ${entering ? 'leaving' : ''}`}>
      <div className="intro-top">
        <button className="ghost" onClick={() => setSound(!sound)}>{sound ? '🔊 Sonido ambiental: ACTIVO' : '🔇 Activar sonido ambiental (opcional)'}</button>
      </div>
      <div className="intro-title">
        <p className="kicker">SEDE VIRTUAL · CENTRO DE OPERACIONES DE IA</p>
        <h1><span>DETONADOR</span><em>A I &nbsp; E M P I R E</em></h1>
      </div>
      <div className="intro-center">
        <button className="enter" onClick={go} disabled={entering}>ENTRAR A MI EMPRESA</button>
        <p className="sub">Entrarás al despacho de TITAN X, tu CEO virtual.</p>
      </div>
      <p className="intro-foot">Entorno de desarrollo · ningún agente está conectado todavía</p>
    </div>
  );
}
