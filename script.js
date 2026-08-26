/**
 * ==============================================================
 * Signal Flow Diagram (Additive Synthesis Patch)
 *
 *   osc1 ─ gain1 ─┐
 *   osc2 ─ gain2 ─┤
 *   osc3 ─ gain3 ─┤
 *   osc4 ─ gain4 ─┤──► masterGain ─► speakers (ctx.destination)
 *   osc5 ─ gain5 ─┘
 *
 * - 5 oscillators tuned to odd harmonics of a base frequency
 * - Each harmonic scaled down in amplitude (1/n^2 style)
 * - Frequencies update every `loopInt` ms with random choice
 * - Sliders:
 *     • "speed" = update rate in ms
 *     • "masterGain" = overall loudness in dBFS
 * - Button:
 *     • "startStop" = resume/suspend AudioContext
 * ==============================================================
 */

// Create the main AudioContext — this is the "engine" for all Web Audio
const ctx = new AudioContext()

// Time interval (in ms) for how often we pick a new random frequency
let loopInt = 125;

// Pre-calculated frequencies for a C minor pentatonic scale in just intonation
const freqs = [
    130.81,  // C3
    152.61,  // Eb3
    152.61,  // (duplicate Eb3, maybe intentional for weighting?)
    174.41,  // F3
    196.22,  // G3
    228.92,  // Bb3
    261.62,  // C4
    305.22,  // Eb4
    348.82,  // F4
    392.44,  // G4
    457.85,  // Bb4
    523.24   // C5
];

// Create five oscillators at odd harmonics of the fundamental frequency
// (classic additive synthesis approach to build timbre)
const osc1 = new OscillatorNode(ctx, {frequency: freqs[0]});
const osc2 = new OscillatorNode(ctx, {frequency: freqs[0]*3});
const osc3 = new OscillatorNode(ctx, {frequency: freqs[0]*5});
const osc4 = new OscillatorNode(ctx, {frequency: freqs[0]*7});
const osc5 = new OscillatorNode(ctx, {frequency: freqs[0]*9});

// Create gain nodes for each harmonic, scaling by 1/n^2 (approximation of harmonic amplitudes)
const gain1 = new GainNode(ctx, {gain: 1});
const gain2 = new GainNode(ctx, {gain: 1/9});
const gain3 = new GainNode(ctx, {gain: 1/25});
const gain4 = new GainNode(ctx, {gain: 1/49});
const gain5 = new GainNode(ctx, {gain: 1/81});

// Master gain to control total output amplitude, scaled by 2/π so that the
// summed amplitudes of the odd harmonics approximate a normalized triangle wave.
const masterGain = new GainNode(ctx, {gain: 0.5 * 2/Math.PI})

// Connect oscillators → individual gain → master gain → speakers
osc1.connect(gain1).connect(masterGain).connect(ctx.destination);
osc2.connect(gain2).connect(masterGain);
osc3.connect(gain3).connect(masterGain);
osc4.connect(gain4).connect(masterGain);
osc5.connect(gain5).connect(masterGain);
//prevent autostart
ctx.suspend()
// Start all oscillators running
osc1.start();
osc2.start();
osc3.start();
osc4.start();
osc5.start();

// Button toggles AudioContext start/stop
document.getElementById("startStop").addEventListener("click", (e)=>{
    if (e.target.innerText === "Start"){
        ctx.resume()               // Resume audio
        e.target.innerText = "Stop"
    } else {
        e.target.innerText = "Start"
        ctx.suspend()              // Pause audio
    }
})

// Convert dBFS values into linear gain multipliers
const dbtoa = function (dBFS){
    return 10 ** (dBFS/20);
}

// Function to update oscillator frequencies randomly from freqs array
const freqUpdate = function(){
    let newFreq = freqs[Math.floor(Math.random()*freqs.length)]
    // Use exponential ramps for smooth transitions
    osc1.frequency.exponentialRampToValueAtTime(newFreq, ctx.currentTime + 0.02);
    osc2.frequency.exponentialRampToValueAtTime(newFreq * 3, ctx.currentTime + 0.02);
    osc3.frequency.exponentialRampToValueAtTime(newFreq * 5, ctx.currentTime + 0.02);
    osc4.frequency.exponentialRampToValueAtTime(newFreq * 7, ctx.currentTime + 0.02);
    osc5.frequency.exponentialRampToValueAtTime(newFreq * 9, ctx.currentTime + 0.02);
}

// Loop that triggers freqUpdate every `loopInt` ms
let loop = setInterval(freqUpdate, loopInt)

// Slider to adjust the speed (ms per update)
document.getElementById("speed").addEventListener("input", (e)=>{
    loopInt = e.target.value;
    document.getElementById("speedLabel").innerText = `${loopInt} ms`
    clearInterval(loop);                   // Stop old loop
    loop = setInterval(freqUpdate, loopInt) // Restart with new interval
})

// Slider to control overall master gain in dB
document.getElementById("masterGain").addEventListener("input", (e)=>{
    // Convert from dBFS to linear gain, then scaled by 2/π so that the
    // summed amplitudes of the odd harmonics approximate a normalized triangle wave.
    masterGain.gain.linearRampToValueAtTime(dbtoa(e.target.value) * 2/Math.PI, ctx.currentTime + 0.01);
    // Update on-screen label with dB value, truncated to 2 decimals
    document.getElementById("gainLabel").innerText = `${parseFloat(e.target.value).toFixed(2)} dBFS`
})
