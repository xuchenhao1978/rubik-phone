// 照片颜色识别 + 把六面颜色变成魔方状态。纯函数，浏览器和 node 测试共用。
(function (root) {
  "use strict";
  const Lib = typeof module !== "undefined" && module.exports ? require("./cube.js") : root.CubeLib;
  const R = [-1, 0, 1], Y = [1, 0, -1];
  // 每一面拍照时 9 格（从左到右、从上到下）对应的方块位置
  const GRID = { U: [], F: [], R: [], B: [], L: [], D: [] };
  for (const a of R) for (const b of R) GRID.U.push([b, 1, a]);
  for (const a of Y) for (const b of R) GRID.F.push([b, a, 1]);
  for (const a of Y) for (const b of Y) GRID.R.push([1, a, b]);
  for (const a of Y) for (const b of Y) GRID.B.push([b, a, -1]);
  for (const a of Y) for (const b of R) GRID.L.push([-1, a, b]);
  for (const a of Y) for (const b of R) GRID.D.push([b, -1, a]);

  function locIndex(p, f) {
    return Lib.LOCS.findIndex(l => l.n === f && l.p.join() === p.join());
  }

  // faces = {U:[9 个颜色字母], ...}；颜色字母就是该颜色中心所在的面
  function stateFromFaces(faces) {
    const color = new Array(54);
    for (const f in GRID) GRID[f].forEach((p, i) => { color[locIndex(p, f)] = faces[f][i]; });
    const home = {};
    Lib.LOCS.forEach(l => {
      const k = l.p.join();
      (home[k] = home[k] || []).push(l.n);
    });
    const byColors = {};
    for (const k in home) byColors[home[k].slice().sort().join("")] = k.split(",").map(Number);
    const used = new Set();
    const s = new Array(54);
    for (const k in home) {
      const p = k.split(",").map(Number);
      const here = home[k].map(f => ({ f, c: color[locIndex(p, f)] }));
      const id = here.map(h => h.c).sort().join("");
      const target = byColors[id];
      if (!target) throw new Error("有一块的颜色组合不存在：" + here.map(h => Lib.COLOR_NAME[h.c]).join(""));
      if (used.has(target.join())) throw new Error("同一块出现了两次：" + here.map(h => Lib.COLOR_NAME[h.c]).join(""));
      used.add(target.join());
      for (const h of here) s[locIndex(p, h.f)] = locIndex(target, h.c);
    }
    return s;
  }

  function counts(faces) {
    const c = { U: 0, D: 0, F: 0, B: 0, R: 0, L: 0 };
    for (const f in faces) for (const x of faces[f]) if (x) c[x]++;
    return c;
  }

  // 校验并求解：真解一遍，确认最后确实还原，才算这组颜色是合法魔方
  function solveFaces(faces) {
    const c = counts(faces);
    const bad = Object.keys(c).filter(k => c[k] !== 9);
    if (bad.length) throw new Error("每种颜色应有 9 格，现在 " + bad.map(k => Lib.COLOR_NAME[k] + c[k]).join("、"));
    const s = stateFromFaces(faces);
    const segs = Lib.solve(s);
    const all = segs.reduce((a, g) => a.concat(g.tokens), []);
    const end = Lib.apply(s, all);
    if (!Lib.isSolved(end)) throw new Error("颜色组合拼不成真魔方");
    return { state: s, segs };
  }

  function hsv(r, g, b) {
    const M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m;
    let h = 0;
    if (d) h = M === r ? ((g - b) / d + 6) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, M ? d / M : 0, M / 255];
  }

  function guess(r, g, b) {
    const [h, s, v] = hsv(r, g, b);
    if (s < 0.28 && v > 0.35) return "D";
    if (h < 8 || h >= 335) return "L";
    if (h < 30) return "R";
    if (h < 72) return "U";
    if (h < 170) return "F";
    return "B";
  }

  function lab(r, g, b) {
    const f = c => { c /= 255; return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; };
    const [x0, y0, z0] = [f(r), f(g), f(b)];
    const t = v => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
    const x = t((0.4124 * x0 + 0.3576 * y0 + 0.1805 * z0) / 0.9505);
    const y = t(0.2126 * x0 + 0.7152 * y0 + 0.0722 * z0);
    const z = t((0.0193 * x0 + 0.1192 * y0 + 0.9505 * z0) / 1.089);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  }

  // 用六个中心块的实拍颜色当标尺，重新判断没被手动改过的格子。亮度权重调低以抵抗光线差异。
  function refine(rgbs, faces, edited) {
    const ref = {};
    for (const f in rgbs) ref[f] = lab(...rgbs[f][4]);
    const out = {};
    for (const f in rgbs) {
      out[f] = rgbs[f].map((px, i) => {
        if (i === 4) return f;
        if (edited[f + i]) return faces[f][i];
        const c = lab(...px);
        let best = null, bd = 1e12;
        for (const k in ref) {
          const d = 0.15 * (c[0] - ref[k][0]) ** 2 + (c[1] - ref[k][1]) ** 2 + (c[2] - ref[k][2]) ** 2;
          if (d < bd) { bd = d; best = k; }
        }
        return best;
      });
    }
    return out;
  }

  const api = { GRID, stateFromFaces, solveFaces, counts, guess, refine };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CubeScan = api;
})(this);
