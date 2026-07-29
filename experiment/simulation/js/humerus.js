/* ==============================
   CONFIGURATION
============================== */
const CM_PER_PIXEL = 1 / 20; // 0.05

const TARGETS = {
    length:   { val: 26.92, tol: 1,   unit: "cm", instr: "Measure maximum length using osteometric board." },
    proximal: { val: 3.79,  tol: 0.5, unit: "cm", instr: "Measure proximal breadth using sliding calipers." },
    distal:   { val: 5.01,  tol: 0.5, unit: "cm", instr: "Measure distal breadth using sliding calipers." },
    girth:    { val: 3.81,  tol: 0.5, unit: "cm", instr: "Wrap the tape around the mid-shaft (narrowest point) and drag the tab until it sits snug, then read the girth." },
    angle_cd: { val: 98,    tol: 3,   unit: "deg", instr: "Measure condylo-diaphysial angle using goniometer." },
    angle_t:  { val: 60,    tol: 5,   unit: "deg", instr: "Measure torsion angle using goniometer." },
    indices:  { val: 0,     tol: 0,   unit: "", instr: "Enter measured values to calculate humerus indices." },
};

/* ==============================
   REAL HUMERUS MEASUREMENTS (HIDDEN)
============================== */

const REAL_HUMERUS = {
    length: 26.92,
    proximal: 3.79,
    distal: 5.01,
    girth: 3.81
};

const BONE_POSES = {
    length:   { left: "120px", top: "100px",  rotate: 0  },
    proximal: { left: "200px", top: "270px", rotate: 90 },
    distal:   { left: "200px", top: "270px", rotate: 270 },
    girth:    { left: "300px", top: "270px",  rotate: 270 },
    angle_cd: { left: "330px", top: "270px", rotate: 90 },
    angle_t:  { left: "330px", top: "270px", rotate: 90 }
};

/* ==============================
   STATE VARIABLES
============================== */

let currentMode = "length";
let boneLocked = true;
let currentReading = 0;
let dragged = null;
let rotatingArm = null;
let offset = { x: 0, y: 0 };

/* ==============================
   MODE SWITCHING
============================== */

function setMode(mode, event) {

    currentMode = mode;

    document.querySelectorAll(".nav-btn")
        .forEach(btn => btn.classList.remove("active"));

    if (event && event.target) {
        event.target.classList.add("active");
    } else {
        document.querySelector(`.nav-btn[onclick*="${mode}"]`)
            ?.classList.add("active");
    }

    [
        "tool-board",
        "tool-caliper",
        "tool-tape",
        "tool-goniometer",
        "tool-indices"
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });

    document.getElementById("instruction").innerText =
        TARGETS[mode]?.instr || "";

    document.getElementById("unit").innerText =
        TARGETS[mode]?.unit || "";

    document.getElementById("readout").innerText = 0;
    document.getElementById("feedback").innerText = "";

    currentReading = 0;

    const bone = document.getElementById("bone");

    /* Hide bone in indices mode */
    if (mode === "indices") {
        bone.style.display = "none";
        document.getElementById("tool-indices").style.display = "block";
        return;
    } else {
        bone.style.display = "block";
    }

    const pose = BONE_POSES[mode];
    if (pose) {
        bone.style.left = pose.left;
        bone.style.top = pose.top;
        bone.style.transform = `rotate(${pose.rotate}deg)`;
    }
    if (
        mode === "proximal" ||
        mode === "distal" ||
        mode === "angle_cd" ||
        mode === "angle_t"
    ) {
        boneLocked = true;
        bone.style.cursor = "default";
        bone.style.boxShadow = "none";
    } else {
        boneLocked = false;
        bone.style.cursor = "grab";
    }

    if (mode === "length") {
        document.getElementById("tool-board").style.display = "block";
        spawnBoardNearBone();
    }
    else if (mode === "proximal" || mode === "distal") {
        document.getElementById("tool-caliper").style.display = "block";
        spawnCalipersNearBone();
    }
    else if (mode === "girth") {
        document.getElementById("tool-tape").style.display = "block";
        spawnTapeNearBone();
    }
    else {
        document.getElementById("tool-goniometer").style.display = "block";
        spawnGoniometerNearBone();
    }
}

/* ==============================
   TOOL SPAWN
============================== */

function spawnBoardNearBone() {
    document.getElementById("movable-wall").style.left = "420px";
}

function spawnCalipersNearBone() {
    const jaw1 = document.getElementById("caliper-jaw-1");
    const jaw2 = document.getElementById("caliper-jaw-2");
    if (jaw1) jaw1.style.left = "330px";
    if (jaw2) jaw2.style.left = "450px";
}

function spawnTapeNearBone() {

    const anchor = document.getElementById("tape-anchor");
    const band = document.getElementById("tape-band");
    const end = document.getElementById("tape-end");

    /* anchor pin sits at the mid-shaft "wrap point" */
    const anchorX = 300;
    const anchorY = 300;
    const startWidth = 80; /* px, initial pulled-out length */

    anchor.style.left = anchorX + "px";
    anchor.style.top = anchorY + "px";

    band.style.left = (anchorX + 7) + "px";
    band.style.top = (anchorY - 6) + "px";
    band.style.width = startWidth + "px";

    end.style.left = (anchorX + 7 + startWidth) + "px";
    end.style.top = (anchorY - 11) + "px";

    currentReading = startWidth * CM_PER_PIXEL;
    document.getElementById("readout").innerText = currentReading.toFixed(2);
}

function spawnGoniometerNearBone() {
    const g = document.getElementById("goniometer");
    g.style.left = "350px";
    g.style.top = "250px";
}

/* ==============================
   MOUSE EVENTS
============================== */

document.addEventListener("mousedown", e => {

    if (
        (e.target.id === "bone" && !boneLocked) ||
        e.target.id === "movable-wall"
    ) {
        dragged = e.target;
        const rect = dragged.getBoundingClientRect();
        offset.x = e.clientX - rect.left;
        offset.y = e.clientY - rect.top;
    }
    else if (
        e.target.closest("#tool-caliper") &&
        !e.target.closest("#caliper-slider")
    ) {
        dragged = document.getElementById("tool-caliper");
        const rect = dragged.getBoundingClientRect();
        offset.x = e.clientX - rect.left;
        offset.y = e.clientY - rect.top;
    }
    else if (e.target.closest("#caliper-slider")) {
        dragged = document.getElementById("caliper-slider");
        const rect = dragged.getBoundingClientRect();
        offset.x = e.clientX - rect.left;
        offset.y = e.clientY - rect.top;
    }

    if (e.target.closest("#goniometer") &&
        !e.target.classList.contains("gonio-arm")) {
        dragged = document.getElementById("goniometer");
        const rect = dragged.getBoundingClientRect();
        offset.x = e.clientX - rect.left;
        offset.y = e.clientY - rect.top;
    }

    if (e.target.classList.contains("gonio-arm")) {
        rotatingArm = e.target;
    }

    /* GRAB TAPE END */
    if (e.target.closest("#tape-end")) {
        dragged = document.getElementById("tape-end");
        const rect = dragged.getBoundingClientRect();
        offset.x = e.clientX - rect.left;
        offset.y = e.clientY - rect.top;
    }
});

document.addEventListener("mousemove", e => {

    if (dragged) {

        const workspace =
            document.getElementById("workspace").getBoundingClientRect();

        if (currentMode === "length" && dragged.id === "movable-wall") {

            const bone = document.getElementById("bone").getBoundingClientRect();
            let x = e.clientX - workspace.left;

            const boneStart = 100;
            const boneEnd = boneStart + bone.height;

            if (x > boneEnd) x = boneEnd;
            if (x < boneStart) x = boneStart;

            dragged.style.left = x + "px";

            const pixelDistance = x - boneStart;
            currentReading = pixelDistance * CM_PER_PIXEL;

            document.getElementById("readout").innerText =
                currentReading.toFixed(2);
        }
        else if (dragged.id === "bone") {
            let x = e.clientX - workspace.left - offset.x;
            let y = e.clientY - workspace.top - offset.y;
            dragged.style.left = x + "px";
            dragged.style.top = y + "px";
        }
        else if (dragged.id === "tool-caliper") {
            let x = e.clientX - workspace.left - offset.x;
            let y = e.clientY - workspace.top - offset.y;
            dragged.style.left = x + "px";
            dragged.style.top = y + "px";
        }
        else if (dragged.id === "caliper-slider") {
            const caliperBody =
                document.getElementById("caliper-body")
                .getBoundingClientRect();

            let x = e.clientX - caliperBody.left - offset.x;
            const minX = 60;
            const maxX = 520;
            if (x < minX) x = minX;
            if (x > maxX) x = maxX;

            dragged.style.left = x + "px";

            const fixedJawX = 40;
            const distancePx = x - fixedJawX;
            currentReading = distancePx * CM_PER_PIXEL;
        }
        else if (dragged.id === "tape-end" && currentMode === "girth") {

            const anchor = document.getElementById("tape-anchor");
            const anchorLeft = parseFloat(anchor.style.left);
            const anchorTop = parseFloat(anchor.style.top);

            let x = e.clientX - workspace.left - offset.x;

            /* keep a minimum pulled length so the band never inverts */
            const minX = anchorLeft + 7 + 20;
            if (x < minX) x = minX;

            dragged.style.left = x + "px";
            dragged.style.top = (anchorTop - 11) + "px";

            const band = document.getElementById("tape-band");
            const bandWidth = x - (anchorLeft + 7);
            band.style.width = bandWidth + "px";

            currentReading = bandWidth * CM_PER_PIXEL;

            const fb = document.getElementById("feedback");
            if (currentReading < 2) {
                fb.innerText = "⚠ Wrap the tape snugly around mid-shaft — it looks too loose.";
                fb.style.color = "orange";
            } else {
                fb.innerText = "";
            }
        }
        else if (
            (currentMode === "angle_cd" || currentMode === "angle_t") &&
            dragged.id === "goniometer"
        ) {
            let x = e.clientX - workspace.left - offset.x;
            let y = e.clientY - workspace.top - offset.y;
            dragged.style.left = x + "px";
            dragged.style.top  = y + "px";
        }

        document.getElementById("readout").innerText = parseFloat(currentReading).toFixed(2);
    }

    if (rotatingArm) {

        const center = document.getElementById("gonio-center").getBoundingClientRect();
        const cx = center.left + center.width / 2;
        const cy = center.top  + center.height / 2;

        const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
        rotatingArm.style.transform = `rotate(${angle}deg)`;

        const a1 = getRotation(document.getElementById("gonio-arm-1"));
        const a2 = getRotation(document.getElementById("gonio-arm-2"));

        let diff = Math.abs(a1 - a2);
        if (diff > 180) diff = 360 - diff;

        currentReading = Math.round(diff);
        document.getElementById("readout").innerText = currentReading;
    }
});

document.addEventListener("mouseup", () => {
    dragged = null;
    rotatingArm = null;
});

/* ==============================
   UTILITIES
============================== */

function getRotation(el) {
    if (!el.style.transform) return 0;
    return parseFloat(el.style.transform.replace("rotate(", "").replace("deg)", ""));
}

function checkMeasurement() {
    const t = TARGETS[currentMode];
    const fb = document.getElementById("feedback");

    if (Math.abs(parseFloat(currentReading) - t.val) <= t.tol) {
        fb.style.color = "green";
        fb.innerText = "✔ Correct measurement.";
    } else {
        fb.style.color = "red";
        fb.innerText = `✖ Incorrect. Accepted value ≈ ${t.val} ${t.unit}`;
    }
}

/* ==============================
   HUMERUS INDICES — TARGET/CORRECT VALUES
   (computed from REAL_HUMERUS so it always
   stays consistent with the hidden bone data)
============================== */

const CORRECT_INDICES = {
    ans_diameter: REAL_HUMERUS.girth / 3.1416,
    ans_caliber:  (REAL_HUMERUS.girth * 100) / REAL_HUMERUS.length,
    ans_slender:  ((REAL_HUMERUS.girth / 3.1416) * 100) / REAL_HUMERUS.length,
    ans_prox:     (REAL_HUMERUS.proximal * 100) / REAL_HUMERUS.length,
    ans_dist:     (REAL_HUMERUS.distal * 100) / REAL_HUMERUS.length,
    ans_ratio:    (REAL_HUMERUS.distal * 100) / REAL_HUMERUS.proximal,
    ans_epi:      ((REAL_HUMERUS.proximal + REAL_HUMERUS.distal) * 100) / REAL_HUMERUS.length
};

/* ==============================
   LIVE FRACTION CALCULATION
   (mirrors the Femur lab's calculate() pattern)
============================== */

function calculate(numId, denId, ansId) {

    const num = parseFloat(document.getElementById(numId).value);
    const den = parseFloat(document.getElementById(denId).value);
    const ans = document.getElementById(ansId);

    if (isNaN(num) || isNaN(den) || den === 0) {
        ans.value = "";
        ans.style.background = "#fff8dc";
        ans.style.border = "2px solid #f1c40f";
        return;
    }

    const result = (num * 100) / den;
    ans.value = result.toFixed(2);

    const correct = CORRECT_INDICES[ansId];
    const tolerance = 0.5;

    if (Math.abs(result - correct) <= tolerance) {
        ans.style.background = "#d4edda";
        ans.style.border = "3px solid green";
        ans.style.color = "green";
    } else {
        ans.style.background = "#f8d7da";
        ans.style.border = "3px solid red";
        ans.style.color = "red";
    }
}

/* Minimum Shaft Diameter = Girth ÷ 3.1416 (no ×100 factor) */
function calculateDiameter() {

    const num = parseFloat(document.getElementById("diam_num").value);
    const ans = document.getElementById("ans_diameter");

    if (isNaN(num)) {
        ans.value = "";
        ans.style.background = "#fff8dc";
        ans.style.border = "2px solid #f1c40f";
        return;
    }

    const result = num / 3.1416;
    ans.value = result.toFixed(2);

    const correct = CORRECT_INDICES.ans_diameter;
    const tolerance = 0.2;

    if (Math.abs(result - correct) <= tolerance) {
        ans.style.background = "#d4edda";
        ans.style.border = "3px solid green";
        ans.style.color = "green";
    } else {
        ans.style.background = "#f8d7da";
        ans.style.border = "3px solid red";
        ans.style.color = "red";
    }
}

/* Epiphysial Proportion Index = (Proximal + Distal) × 100 / Length */
function calculateEpi() {

    const n1 = parseFloat(document.getElementById("epi_num1").value);
    const n2 = parseFloat(document.getElementById("epi_num2").value);
    const den = parseFloat(document.getElementById("epi_den").value);
    const ans = document.getElementById("ans_epi");

    if (isNaN(n1) || isNaN(n2) || isNaN(den) || den === 0) {
        ans.value = "";
        ans.style.background = "#fff8dc";
        ans.style.border = "2px solid #f1c40f";
        return;
    }

    const result = ((n1 + n2) * 100) / den;
    ans.value = result.toFixed(2);

    const correct = CORRECT_INDICES.ans_epi;
    const tolerance = 0.5;

    if (Math.abs(result - correct) <= tolerance) {
        ans.style.background = "#d4edda";
        ans.style.border = "3px solid green";
        ans.style.color = "green";
    } else {
        ans.style.background = "#f8d7da";
        ans.style.border = "3px solid red";
        ans.style.color = "red";
    }
}

/* Live update on every keystroke, same pattern as Femur lab */
document.addEventListener("input", () => {

    calculateDiameter();

    calculate("caliber_num", "caliber_den", "ans_caliber");
    calculate("slender_num", "slender_den", "ans_slender");
    calculate("prox_num", "prox_den", "ans_prox");
    calculate("dist_num", "dist_den", "ans_dist");
    calculate("ratio_num", "ratio_den", "ans_ratio");

    calculateEpi();
});

/* ==============================
   FINAL SCORE CHECK
============================== */

function checkIndices() {

    const tolerance = 2.5;

    const L = REAL_HUMERUS.length;
    const P = REAL_HUMERUS.proximal;
    const D = REAL_HUMERUS.distal;
    const G = REAL_HUMERUS.girth;

    const correct = {
        diameter: G / 3.1416,
        caliber: (G * 100) / L,
        slender: ((G / 3.1416) * 100) / L,
        prox: (P * 100) / L,
        dist: (D * 100) / L,
        ratio: (D * 100) / P,
        epi: ((P + D) * 100) / L
    };

    const user = {
        diameter: parseFloat(document.getElementById("ans_diameter").value),
        caliber: parseFloat(document.getElementById("ans_caliber").value),
        slender: parseFloat(document.getElementById("ans_slender").value),
        prox: parseFloat(document.getElementById("ans_prox").value),
        dist: parseFloat(document.getElementById("ans_dist").value),
        ratio: parseFloat(document.getElementById("ans_ratio").value),
        epi: parseFloat(document.getElementById("ans_epi").value)
    };

    let score = 0;
    let total = 7;

    for (let key in correct) {

        const input = document.getElementById("ans_" + key);

        if (Math.abs(user[key] - correct[key]) <= tolerance) {
            input.style.border = "3px solid green";
            input.style.backgroundColor = "#e6ffe6";
            score++;
        } else {
            input.style.border = "3px solid red";
            input.style.backgroundColor = "#ffe6e6";
        }
    }

    const feedback = document.getElementById("indexFeedback");

    if (score === total) {
        feedback.style.color = "green";
        feedback.innerHTML = `✔ Excellent! All calculations correct. (${score}/7)`;
    } else {
        feedback.style.color = "red";
        feedback.innerHTML = `
            ✖ Some calculations are incorrect.<br>
            Score: ${score}/7
        `;
    }
}

/* ==============================
   OSTEOMETRIC BOARD SCALE
============================== */

function createScale() {

    const scale = document.getElementById("scale");
    scale.innerHTML = "";

    const PX_PER_CM = 16.3;

    for (let i = 0; i <= 50; i++) {

        const tick = document.createElement("div");
        tick.style.left = (i * PX_PER_CM) + "px";
        tick.classList.add("tick");

        if (i % 10 === 0) {
            tick.classList.add("large");

            const label = document.createElement("div");
            label.classList.add("tick-label");
            label.style.left = (i * PX_PER_CM - 5) + "px";
            label.innerText = i;

            scale.appendChild(label);

        } else if (i % 5 === 0) {
            tick.classList.add("medium");
        } else {
            tick.classList.add("small");
        }

        scale.appendChild(tick);
    }
}

/* ==============================
   GONIOMETER SCALE
============================== */

function createGonioScale() {

    const scale = document.getElementById("gonio-scale");
    scale.innerHTML = "";

    const radius = 78;

    for (let deg = 0; deg < 360; deg += 5) {

        const tick = document.createElement("div");
        tick.classList.add("gonio-tick");

        let tickLength = 6;
        if (deg % 10 === 0) tickLength = 12;

        const angle = (deg - 90) * Math.PI / 180;
        const x = 90 + radius * Math.cos(angle);
        const y = 90 + radius * Math.sin(angle);

        tick.style.left = x + "px";
        tick.style.top = y + "px";
        tick.style.height = tickLength + "px";
        tick.style.transform = `translate(-50%, -100%) rotate(${deg}deg)`;

        scale.appendChild(tick);

        if (deg % 20 === 0) {

            const label = document.createElement("div");
            label.classList.add("gonio-label");
            label.innerText = deg;

            const lx = 90 + (radius - 18) * Math.cos(angle);
            const ly = 90 + (radius - 18) * Math.sin(angle);

            label.style.left = lx + "px";
            label.style.top = ly + "px";

            scale.appendChild(label);
        }
    }
}

const bone = document.getElementById("bone");
bone.ondragstart = () => false;

bone.addEventListener("dblclick", () => {

    const fixedModes = [
        "proximal",
        "distal",
        "angle_cd",
        "angle_t"
    ];

    if (fixedModes.includes(currentMode)) {
        return;
    }

    boneLocked = !boneLocked;

    if (!boneLocked) {
        bone.style.cursor = "grab";
        bone.style.boxShadow = "0 8px 20px rgba(0,0,0,0.25)";
    } else {
        bone.style.cursor = "default";
        bone.style.boxShadow = "none";
    }
});

/* ==============================
   INITIAL LOAD
============================== */

setMode("length");
createScale();
createGonioScale();