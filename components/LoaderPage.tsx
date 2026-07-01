'use client';

interface LoaderPageProps {
  text?: string;
}

export default function LoaderPage({ text = 'Memuat...' }: LoaderPageProps) {
  return (
    <>
      <style>{`
        @keyframes bounce05 {
          85%, 92%, 100% { transform: translateY(0); }
          89% { transform: translateY(-4px); }
          95% { transform: translateY(2px); }
        }
        @keyframes slide05 {
          5% { transform: translateX(14px); }
          15%, 30% { transform: translateX(6px); }
          40%, 55% { transform: translateX(0); }
          65%, 70% { transform: translateX(-4px); }
          80%, 89% { transform: translateX(-12px); }
          100% { transform: translateX(14px); }
        }
        @keyframes paper05 {
          5% { transform: translateY(46px); }
          20%, 30% { transform: translateY(34px); }
          40%, 55% { transform: translateY(22px); }
          65%, 70% { transform: translateY(10px); }
          80%, 85% { transform: translateY(0); }
          92%, 100% { transform: translateY(46px); }
        }
        @keyframes keyboard05 {
          5%,12%,21%,30%,39%,48%,57%,66%,75%,84% {
            box-shadow: 15px 0 0 #fff,30px 0 0 #fff,45px 0 0 #fff,60px 0 0 #fff,75px 0 0 #fff,90px 0 0 #fff,22px 10px 0 #fff,37px 10px 0 #fff,52px 10px 0 #fff,60px 10px 0 #fff,68px 10px 0 #fff,83px 10px 0 #fff;
          }
          9%  { box-shadow: 15px 2px 0 #fff,30px 0 0 #fff,45px 0 0 #fff,60px 0 0 #fff,75px 0 0 #fff,90px 0 0 #fff,22px 10px 0 #fff,37px 10px 0 #fff,52px 10px 0 #fff,60px 10px 0 #fff,68px 10px 0 #fff,83px 10px 0 #fff; }
          18% { box-shadow: 15px 0 0 #fff,30px 0 0 #fff,45px 0 0 #fff,60px 2px 0 #fff,75px 0 0 #fff,90px 0 0 #fff,22px 10px 0 #fff,37px 10px 0 #fff,52px 10px 0 #fff,60px 10px 0 #fff,68px 10px 0 #fff,83px 10px 0 #fff; }
          27% { box-shadow: 15px 0 0 #fff,30px 0 0 #fff,45px 0 0 #fff,60px 0 0 #fff,75px 0 0 #fff,90px 0 0 #fff,22px 12px 0 #fff,37px 10px 0 #fff,52px 10px 0 #fff,60px 10px 0 #fff,68px 10px 0 #fff,83px 10px 0 #fff; }
          36% { box-shadow: 15px 0 0 #fff,30px 0 0 #fff,45px 0 0 #fff,60px 0 0 #fff,75px 0 0 #fff,90px 0 0 #fff,22px 10px 0 #fff,37px 10px 0 #fff,52px 12px 0 #fff,60px 12px 0 #fff,68px 12px 0 #fff,83px 10px 0 #fff; }
          45% { box-shadow: 15px 0 0 #fff,30px 0 0 #fff,45px 0 0 #fff,60px 0 0 #fff,75px 0 0 #fff,90px 2px 0 #fff,22px 10px 0 #fff,37px 10px 0 #fff,52px 10px 0 #fff,60px 10px 0 #fff,68px 10px 0 #fff,83px 10px 0 #fff; }
          54% { box-shadow: 15px 0 0 #fff,30px 2px 0 #fff,45px 0 0 #fff,60px 0 0 #fff,75px 0 0 #fff,90px 0 0 #fff,22px 10px 0 #fff,37px 10px 0 #fff,52px 10px 0 #fff,60px 10px 0 #fff,68px 10px 0 #fff,83px 10px 0 #fff; }
          63% { box-shadow: 15px 0 0 #fff,30px 0 0 #fff,45px 0 0 #fff,60px 0 0 #fff,75px 0 0 #fff,90px 0 0 #fff,22px 10px 0 #fff,37px 10px 0 #fff,52px 10px 0 #fff,60px 10px 0 #fff,68px 10px 0 #fff,83px 12px 0 #fff; }
          72% { box-shadow: 15px 0 0 #fff,30px 0 0 #fff,45px 2px 0 #fff,60px 0 0 #fff,75px 0 0 #fff,90px 0 0 #fff,22px 10px 0 #fff,37px 10px 0 #fff,52px 10px 0 #fff,60px 10px 0 #fff,68px 10px 0 #fff,83px 10px 0 #fff; }
          81% { box-shadow: 15px 0 0 #fff,30px 0 0 #fff,45px 0 0 #fff,60px 0 0 #fff,75px 0 0 #fff,90px 0 0 #fff,22px 10px 0 #fff,37px 12px 0 #fff,52px 10px 0 #fff,60px 10px 0 #fff,68px 10px 0 #fff,83px 10px 0 #fff; }
        }
        .tw-wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
        }
        .tw-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
        }
        .tw-text {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 13px;
          color: #6b7280;
          letter-spacing: 0.3px;
        }
        .typewriter {
          --blue: #5C86FF;
          --blue-dark: #275EFE;
          --tool: #FBC56C;
          --paper: #EEF0FD;
          --text: #D3D4EC;
          --duration: 3s;
          position: relative;
          animation: bounce05 var(--duration) linear infinite;
        }
        .typewriter .slide {
          width: 92px; height: 20px; border-radius: 3px;
          margin-left: 14px; transform: translateX(14px);
          background: linear-gradient(var(--blue), var(--blue-dark));
          animation: slide05 var(--duration) ease infinite;
        }
        .typewriter .slide:before,
        .typewriter .slide:after,
        .typewriter .slide i:before {
          content: ""; position: absolute; background: var(--tool);
        }
        .typewriter .slide:before { width: 2px; height: 8px; top: 6px; left: 100%; }
        .typewriter .slide:after  { left: 94px; top: 3px; height: 14px; width: 6px; border-radius: 3px; }
        .typewriter .slide i {
          display: block; position: absolute; right: 100%;
          width: 6px; height: 4px; top: 4px; background: var(--tool);
        }
        .typewriter .slide i:before {
          right: 100%; top: -2px; width: 4px; border-radius: 2px; height: 14px;
        }
        .typewriter .paper {
          position: absolute; left: 24px; top: -26px;
          width: 40px; height: 46px; border-radius: 5px;
          background: var(--paper); transform: translateY(46px);
          animation: paper05 var(--duration) linear infinite;
        }
        .typewriter .paper:before {
          content: ""; position: absolute; left: 6px; right: 6px; top: 7px;
          border-radius: 2px; height: 4px; transform: scaleY(0.8);
          background: var(--text);
          box-shadow: 0 12px 0 var(--text), 0 24px 0 var(--text), 0 36px 0 var(--text);
        }
        .typewriter .keyboard {
          width: 120px; height: 56px; margin-top: -10px;
          z-index: 1; position: relative;
        }
        .typewriter .keyboard:before,
        .typewriter .keyboard:after { content: ""; position: absolute; }
        .typewriter .keyboard:before {
          top: 0; left: 0; right: 0; bottom: 0; border-radius: 7px;
          background: linear-gradient(135deg, var(--blue), var(--blue-dark));
          transform: perspective(10px) rotateX(2deg);
          transform-origin: 50% 100%;
        }
        .typewriter .keyboard:after {
          left: 2px; top: 25px; width: 11px; height: 4px; border-radius: 2px;
          box-shadow: 15px 0 0 #fff,30px 0 0 #fff,45px 0 0 #fff,60px 0 0 #fff,75px 0 0 #fff,90px 0 0 #fff,22px 10px 0 #fff,37px 10px 0 #fff,52px 10px 0 #fff,60px 10px 0 #fff,68px 10px 0 #fff,83px 10px 0 #fff;
          animation: keyboard05 var(--duration) linear infinite;
        }
      `}</style>

      <div className="tw-wrap">
        <div className="tw-inner">
          <div className="typewriter">
            <div className="slide"><i /></div>
            <div className="paper" />
            <div className="keyboard" />
          </div>
          <p className="tw-text">{text}</p>
        </div>
      </div>
    </>
  );
}