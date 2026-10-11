import React, { useState, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import {
  Minus,
  Plus,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  AlertCircle,
  Percent,
  DollarSign,
  Clock,
  Sparkles
} from 'lucide-react';

interface QuotexConsoleProps {
  onOpenAssetModal: () => void;
}

export const QuotexConsole: React.FC<QuotexConsoleProps> = ({ onOpenAssetModal }) => {
  const {
    activeAsset,
    accountType,
    setAccountType,
    demoBalance,
    realBalance,
    setRealBalanceDirect,
    placeTrade
  } = useTrading();

  // Investment state directly editable by user
  const [investmentAmount, setInvestmentAmount] = useState<number>(100);
  const [investmentInputStr, setInvestmentInputStr] = useState<string>('100');
  const [isPercentMode, setIsPercentMode] = useState<boolean>(false);
  const [percentValue, setPercentValue] = useState<number>(5); // 5% default when switched to %
  const [showPercentPicker, setShowPercentPicker] = useState<boolean>(false);

  // Timer state: countdown seconds OR Real-Time clock mode
  const [durationSeconds, setDurationSeconds] = useState<number>(30); // 30s default
  const [timerMode, setTimerMode] = useState<'duration' | 'realtime'>('duration');
  const [showTimerPicker, setShowTimerPicker] = useState<boolean>(false);
  const [realTimeClock, setRealTimeClock] = useState<string>('');

  const [pendingTrade, setPendingTrade] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentBalance = accountType === 'DEMO' ? demoBalance : realBalance;
  const payoutRate = activeAsset.payout;

  // Real-time system clock updater
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, '0');
      const mm = now.getMinutes().toString().padStart(2, '0');
      const ss = now.getSeconds().toString().padStart(2, '0');
      setRealTimeClock(`${hh}:${mm}:${ss}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate current trade dollar amount
  const effectiveInvestment = isPercentMode
    ? Math.max(1, Number(((currentBalance * percentValue) / 100).toFixed(2)))
    : investmentAmount;

  // Percentage of balance that this trade represents
  const effectivePercentage = currentBalance > 0
    ? Number(((effectiveInvestment / currentBalance) * 100).toFixed(1))
    : 0;

  const totalPayout = Number(
    (effectiveInvestment + (effectiveInvestment * payoutRate) / 100).toFixed(2)
  );

  // Auto-adjust investment if balance drops below
  useEffect(() => {
    if (!isPercentMode && currentBalance >= 1 && investmentAmount > currentBalance) {
      const clamped = Math.max(1, Math.floor(currentBalance));
      setInvestmentAmount(clamped);
      setInvestmentInputStr(clamped.toString());
    }
  }, [accountType, currentBalance, isPercentMode, investmentAmount]);

  const formatTimerDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const timerOptions = [
    { label: '00:00:05', seconds: 5, tag: '5s' },
    { label: '00:00:15', seconds: 15, tag: '15s' },
    { label: '00:00:30', seconds: 30, tag: '30s' },
    { label: '00:01:00', seconds: 60, tag: '1m' },
    { label: '00:02:00', seconds: 120, tag: '2m' },
    { label: '00:05:00', seconds: 300, tag: '5m' }
  ];

  const percentPresets = [1, 2, 5, 10, 15, 20, 25, 50, 100];

  const stepTimer = (dir: -1 | 1) => {
    if (timerMode === 'realtime') {
      // Step in realtime mode changes candle expiration target (+1 min or -1 min)
      setDurationSeconds((s) => Math.max(15, Math.min(600, s + dir * 30)));
      return;
    }
    const steps = [5, 10, 15, 30, 60, 120, 180, 300];
    const idx = steps.indexOf(durationSeconds);
    if (idx !== -1) {
      const nextIdx = Math.max(0, Math.min(steps.length - 1, idx + dir));
      setDurationSeconds(steps[nextIdx]);
    } else {
      setDurationSeconds((s) => Math.max(5, Math.min(300, s + dir * 5)));
    }
  };

  // Smart step for - / + buttons on investment
  const handleStepInvestment = (dir: -1 | 1) => {
    setErrorMessage(null);
    if (isPercentMode) {
      const curIdx = percentPresets.indexOf(percentValue);
      if (curIdx !== -1) {
        const nextIdx = Math.max(0, Math.min(percentPresets.length - 1, curIdx + dir));
        setPercentValue(percentPresets[nextIdx]);
      } else {
        setPercentValue((p) => Math.max(1, Math.min(100, p + dir * 5)));
      }
      return;
    }

    let step = 50;
    if (investmentAmount < 10) step = 1;
    else if (investmentAmount < 50) step = 5;
    else if (investmentAmount < 100) step = 10;
    else if (investmentAmount >= 500) step = 100;
    else if (investmentAmount >= 2000) step = 500;

    const maxAllowed = currentBalance >= 1 ? Math.max(1, Math.floor(currentBalance)) : 100000;
    const nextVal = Math.max(1, Math.min(maxAllowed, investmentAmount + dir * step));
    setInvestmentAmount(nextVal);
    setInvestmentInputStr(nextVal.toString());
  };

  const handleInvestmentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const rawVal = e.target.value.replace(/[^0-9.]/g, '');
    if (isPercentMode) {
      const parsed = parseInt(rawVal, 10);
      if (!isNaN(parsed)) {
        setPercentValue(Math.max(1, Math.min(100, parsed)));
      }
      return;
    }
    setInvestmentInputStr(rawVal);
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed) && parsed > 0) {
      setInvestmentAmount(Math.min(100000, parsed));
    } else if (rawVal === '') {
      setInvestmentAmount(0);
    }
  };

  const handleInvestmentBlur = () => {
    if (isPercentMode) return;
    if (investmentAmount <= 0) {
      const fallback = currentBalance >= 10 ? 10 : Math.max(1, Math.floor(currentBalance || 10));
      setInvestmentAmount(fallback);
      setInvestmentInputStr(fallback.toString());
    } else {
      setInvestmentInputStr(investmentAmount.toString());
    }
  };

  const handleTrade = (direction: 'UP' | 'DOWN') => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch {}
    }

    if (currentBalance < 1) {
      setErrorMessage('Balance is $0.00 — Tap to add funds or use Demo');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    let tradeAmt = effectiveInvestment;
    if (tradeAmt <= 0) {
      tradeAmt = Math.min(10, currentBalance);
      setInvestmentAmount(tradeAmt);
      setInvestmentInputStr(tradeAmt.toString());
    }

    if (tradeAmt > currentBalance) {
      tradeAmt = Number(currentBalance.toFixed(2));
      if (!isPercentMode) {
        setInvestmentAmount(tradeAmt);
        setInvestmentInputStr(tradeAmt.toString());
      }
    }

    setErrorMessage(null);
    placeTrade(direction, tradeAmt, durationSeconds);
  };

  const toggleInvestmentSwitch = () => {
    setIsPercentMode((prev) => !prev);
    setShowPercentPicker((prev) => !prev);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {}
    }
  };

  // Dynamic flags matching the selected asset symbol
  const getAssetFlags = (symbol: string) => {
    const upper = symbol.toUpperCase();
    const flagMap: Record<string, string> = {
      EUR: '🇪🇺',
      USD: '🇺🇸',
      GBP: '🇬🇧',
      JPY: '🇯🇵',
      CHF: '🇨🇭',
      AUD: '🇦🇺',
      CAD: '🇨🇦',
      NZD: '🇳🇿',
      PKR: '🇵🇰',
      INR: '🇮🇳',
      BRL: '🇧🇷',
      TRY: '🇹🇷',
      BTC: '₿',
      ETH: 'Ξ',
      XAU: '🪙'
    };
    const parts = upper.replace(/[^A-Z]/g, ' ').split(/\s+/).filter(Boolean);
    const f1 = flagMap[parts[0]] || '🇪🇺';
    const f2 = flagMap[parts[1]] || '🇨🇭';
    return [f1, f2];
  };

  const [flag1, flag2] = getAssetFlags(activeAsset.symbol);

  return (
    <div className="bg-[#0b0e14] border-t border-[#1a2230] px-3 pt-2 pb-2 select-none relative z-20">
      {/* Alert toast if balance is $0.00 */}
      {errorMessage && (
        <div className="absolute -top-11 left-2 right-2 z-30 bg-[#181f2e] border border-rose-500/70 text-white text-xs px-3 py-1.5 rounded-xl flex items-center justify-between shadow-2xl animate-fadeIn">
          <div className="flex items-center gap-1.5 truncate">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate text-[11px]">{errorMessage}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {accountType === 'REAL' && (
              <button
                onClick={() => {
                  setRealBalanceDirect(1000);
                  setErrorMessage(null);
                }}
                className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[10px] cursor-pointer"
              >
                +$1,000
              </button>
            )}
            <button
              onClick={() => {
                setAccountType('DEMO');
                setErrorMessage(null);
              }}
              className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-black text-[10px] cursor-pointer"
            >
              Use Demo
            </button>
          </div>
        </div>
      )}

      {/* Row 1: Asset Selector & Pending Trade Toggle */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onOpenAssetModal}
          className="flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
        >
          {/* Dynamic Circular Flag Badges */}
          <div className="flex items-center -space-x-1.5">
            <span className="w-5 h-5 rounded-full bg-[#192336] flex items-center justify-center text-[11px] font-bold border border-[#1b2230] shadow-xs">
              {flag1}
            </span>
            <span className="w-5 h-5 rounded-full bg-[#192336] flex items-center justify-center text-[11px] font-bold border border-[#1b2230] shadow-xs">
              {flag2}
            </span>
          </div>

          <span className="font-extrabold text-sm text-white tracking-wide">
            {activeAsset.symbol}
          </span>

          <div className="flex items-center gap-0.5 text-amber-400 font-extrabold text-sm font-mono-num">
            <span>{payoutRate}%</span>
            <ChevronDown className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
          </div>
        </button>

        {/* Right: Pending Trade Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#0284c7] tracking-wider uppercase">
            PENDING TRADE
          </span>
          <button
            onClick={() => setPendingTrade(!pendingTrade)}
            className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
              pendingTrade ? 'bg-[#0284c7] justify-end' : 'bg-[#1e2634] justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
          </button>
        </div>
      </div>

      {/* Row 2: Two Side-by-Side Control Boxes: Timer (Countdown + Real Time) & Investment (Amount + Percentage Selector) */}
      <div className="grid grid-cols-2 gap-2.5 mb-2 relative">
        {/* Box 1: Timer Picker with Real-Time Clock & Duration Modes */}
        <div className="relative bg-[#0d1118] border border-[#273244] hover:border-[#384760] rounded-xl px-2 py-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-cyan-400" />
              <span>{timerMode === 'realtime' ? 'Real Time Clock' : 'Timer'}</span>
            </span>
            {timerMode === 'realtime' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>

          <div className="flex items-center justify-between mt-1">
            <button
              onClick={() => stepTimer(-1)}
              className="w-6 h-6 rounded-md bg-[#18202d] hover:bg-[#222c3d] text-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Decrease Timer"
            >
              <Minus className="w-3.5 h-3.5 stroke-[3]" />
            </button>

            <button
              onClick={() => setShowTimerPicker(!showTimerPicker)}
              className="font-mono-num text-sm sm:text-base font-bold text-white tracking-wider px-1 py-0.5 hover:text-cyan-300 transition-colors cursor-pointer text-center"
              title="Select Timer & Real Time Mode"
            >
              {timerMode === 'realtime' ? realTimeClock : formatTimerDisplay(durationSeconds)}
            </button>

            <button
              onClick={() => stepTimer(1)}
              className="w-6 h-6 rounded-md bg-[#18202d] hover:bg-[#222c3d] text-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Increase Timer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold -mt-0.5 pt-0.5">
            <button
              onClick={() => {
                setTimerMode(timerMode === 'realtime' ? 'duration' : 'realtime');
              }}
              className={`uppercase tracking-wider transition-colors cursor-pointer ${
                timerMode === 'realtime' ? 'text-emerald-400 font-extrabold' : 'text-slate-500 hover:text-cyan-400'
              }`}
              title="Switch to Real Time clock or standard countdown"
            >
              {timerMode === 'realtime' ? '● LIVE TIME' : 'TIME CLOCK'}
            </button>
            <button
              onClick={() => setShowTimerPicker(!showTimerPicker)}
              className="text-[#0284c7] hover:underline uppercase tracking-wider cursor-pointer"
            >
              {durationSeconds}s
            </button>
          </div>

          {/* Timer Dropdown menu with Real Time toggle & presets */}
          {showTimerPicker && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowTimerPicker(false)}
              />
              <div className="absolute bottom-full left-0 mb-1.5 w-full bg-[#141b26] border border-[#263246] rounded-xl shadow-2xl p-2.5 z-40 animate-fadeIn">
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#212c3f]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>Mode Selection</span>
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">
                    {timerMode === 'realtime' ? realTimeClock : `${durationSeconds}s`}
                  </span>
                </div>

                {/* Real Time vs Countdown Selector Tabs */}
                <div className="grid grid-cols-2 gap-1.5 mb-2.5 bg-[#0d121c] p-1 rounded-lg border border-[#212c3f]">
                  <button
                    onClick={() => {
                      setTimerMode('duration');
                    }}
                    className={`py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      timerMode === 'duration'
                        ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Duration
                  </button>
                  <button
                    onClick={() => {
                      setTimerMode('realtime');
                    }}
                    className={`py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      timerMode === 'realtime'
                        ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                    <span>Real Time</span>
                  </button>
                </div>

                {/* Duration Presets */}
                <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">
                  Preset Expirations:
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {timerOptions.map((opt) => (
                    <button
                      key={opt.seconds}
                      onClick={() => {
                        setDurationSeconds(opt.seconds);
                        setShowTimerPicker(false);
                      }}
                      className={`py-1.5 px-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer text-center ${
                        durationSeconds === opt.seconds
                          ? 'bg-[#0284c7] text-white font-black'
                          : 'bg-[#192230] text-slate-300 hover:bg-[#202b3d]'
                      }`}
                    >
                      {opt.tag}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Box 2: Investment Directly Editable with Input Field, % Display, and % Picker */}
        <div className="bg-[#0d1118] border border-[#273244] hover:border-[#384760] rounded-xl px-2 py-1.5 relative flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <DollarSign className="w-2.5 h-2.5 text-emerald-400" />
              <span>Investment</span>
            </span>
            {/* Shows what % of current balance is being invested */}
            <span
              onClick={() => setShowPercentPicker(!showPercentPicker)}
              className="text-[10px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 cursor-pointer transition-colors"
              title="Click to view and choose percentage of balance"
            >
              {effectivePercentage}% of bal
            </span>
          </div>

          <div className="flex items-center justify-between mt-1">
            <button
              onClick={() => handleStepInvestment(-1)}
              className="w-6 h-6 rounded-md bg-[#18202d] hover:bg-[#222c3d] text-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Decrease Investment"
            >
              <Minus className="w-3.5 h-3.5 stroke-[3]" />
            </button>

            {/* Editable Input for Money or Percentage */}
            <div className="flex items-center justify-center font-mono-num font-bold text-sm sm:text-base text-white tracking-wide">
              <input
                type="text"
                inputMode="numeric"
                value={isPercentMode ? percentValue.toString() : investmentInputStr}
                onChange={handleInvestmentInputChange}
                onBlur={handleInvestmentBlur}
                className="w-14 sm:w-18 bg-transparent text-center font-bold text-white outline-none border-b border-transparent focus:border-cyan-400 py-0.5"
                placeholder="100"
              />
              <span className="text-slate-200 ml-0.5">
                {isPercentMode ? '%' : '$'}
              </span>
            </div>

            <button
              onClick={() => handleStepInvestment(1)}
              className="w-6 h-6 rounded-md bg-[#18202d] hover:bg-[#222c3d] text-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Increase Investment"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold -mt-0.5 pt-0.5">
            <button
              onClick={toggleInvestmentSwitch}
              className="text-[#0284c7] hover:underline uppercase tracking-wider cursor-pointer active:opacity-75"
              title="Switch between $ and % of balance"
            >
              {isPercentMode ? 'SWITCH TO $' : 'SWITCH TO %'}
            </button>
            <button
              onClick={() => setShowPercentPicker(!showPercentPicker)}
              className="text-amber-400 hover:text-amber-300 font-mono-num cursor-pointer"
            >
              ≈ ${effectiveInvestment.toFixed(0)}
            </button>
          </div>

          {/* Percentage Presets Picker Dropdown */}
          {showPercentPicker && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowPercentPicker(false)}
              />
              <div className="absolute bottom-full right-0 mb-1.5 w-full bg-[#141b26] border border-[#263246] rounded-xl shadow-2xl p-2.5 z-40 animate-fadeIn">
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#212c3f]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Percent className="w-3 h-3 text-cyan-400" />
                    <span>Invest % of Balance</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    ${currentBalance.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 mb-2">
                  {percentPresets.map((pct) => {
                    const dollarVal = ((currentBalance * pct) / 100).toFixed(0);
                    return (
                      <button
                        key={pct}
                        onClick={() => {
                          setIsPercentMode(true);
                          setPercentValue(pct);
                          setInvestmentAmount(Math.max(1, Number(((currentBalance * pct) / 100).toFixed(2))));
                          setInvestmentInputStr(((currentBalance * pct) / 100).toFixed(0));
                          setShowPercentPicker(false);
                        }}
                        className={`py-1.5 px-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer flex flex-col items-center ${
                          isPercentMode && percentValue === pct
                            ? 'bg-[#0284c7] text-white font-black'
                            : 'bg-[#192230] text-slate-300 hover:bg-[#202b3d]'
                        }`}
                      >
                        <span>{pct}%</span>
                        <span className="text-[9px] text-slate-400 opacity-80">${dollarVal}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1 border-t border-[#212c3f] flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Current Trade:</span>
                  <span className="font-bold text-white font-mono-num">
                    {effectivePercentage}% (${effectiveInvestment.toFixed(2)})
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 3: Payout preview with dotted leader line */}
      <div className="flex items-center justify-between text-xs mb-2 px-1 font-mono-num">
        <span className="text-slate-400 font-medium flex items-center gap-1">
          <span>Payout</span>
          <span className="text-[10px] text-cyan-400 font-bold">({effectivePercentage}% Trade)</span>
        </span>
        <div className="flex-1 mx-2 border-b border-dotted border-slate-700/80"></div>
        <span className="font-bold text-white text-sm tracking-wide">
          {totalPayout.toLocaleString('en-US', {
            minimumFractionDigits: totalPayout % 1 === 0 ? 0 : 2,
            maximumFractionDigits: 2
          })}{' '}
          $
        </span>
      </div>

      {/* Row 4: Two Action Buttons (Buy & Sell) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Buy (Green Button) */}
        <button
          onClick={() => handleTrade('UP')}
          className="w-full bg-[#00c874] hover:bg-[#00e599] active:scale-[0.98] transition-all rounded-xl py-3 px-4 text-white font-black text-base flex items-center justify-between shadow-[0_4px_16px_rgba(0,200,116,0.3)] cursor-pointer"
        >
          <div className="flex flex-col text-left">
            <span className="tracking-wide leading-tight">Buy</span>
            <span className="text-[10px] font-mono opacity-85 font-semibold">
              +${((effectiveInvestment * payoutRate) / 100).toFixed(2)}
            </span>
          </div>
          <ArrowUp className="w-5 h-5 stroke-[3]" />
        </button>

        {/* Sell (Red Button) */}
        <button
          onClick={() => handleTrade('DOWN')}
          className="w-full bg-[#ff3b59] hover:bg-[#ff526d] active:scale-[0.98] transition-all rounded-xl py-3 px-4 text-white font-black text-base flex items-center justify-between shadow-[0_4px_16px_rgba(255,59,89,0.3)] cursor-pointer"
        >
          <div className="flex flex-col text-left">
            <span className="tracking-wide leading-tight">Sell</span>
            <span className="text-[10px] font-mono opacity-85 font-semibold">
              +${((effectiveInvestment * payoutRate) / 100).toFixed(2)}
            </span>
          </div>
          <ArrowDown className="w-5 h-5 stroke-[3]" />
        </button>
      </div>
    </div>
  );
};
