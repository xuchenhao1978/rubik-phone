// 魔方模型 + 七步解法（和《魔方还原图解指南》同一套方法）
// 握法：黄色朝上、绿色朝前。坐标：x 向右，y 向上，z 朝自己。
(function (root) {
  "use strict";

  const NORMAL = { U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0], L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1] };
  const FACES = "UDRLFB";
  const COLOR_NAME = { U: "黄", D: "白", F: "绿", B: "蓝", R: "橙", L: "红" };

  // 54 个贴纸位置：{p: 方块位置, n: 朝向面}
  const LOCS = [];
  const LOC_INDEX = {};
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++)
        for (const f of FACES) {
          const v = NORMAL[f];
          const ax = v[0] ? 0 : v[1] ? 1 : 2;
          if ([x, y, z][ax] === v[ax]) {
            LOC_INDEX[key([x, y, z], f)] = LOCS.length;
            LOCS.push({ p: [x, y, z], n: f });
          }
        }

  function key(p, f) { return p.join(",") + (f ? "|" + f : ""); }
  function faceOf(v) { return FACES.split("").find(f => NORMAL[f].every((c, i) => c === v[i])); }

  // 绕坐标轴逆时针（右手）转 90° × q
  function rot(v, axis, q) {
    let [x, y, z] = v;
    q = ((q % 4) + 4) % 4;
    for (let i = 0; i < q; i++) {
      if (axis === 0) [y, z] = [-z, y];
      else if (axis === 1) [x, z] = [z, -x];
      else [x, y] = [-y, x];
    }
    return [x, y, z];
  }

  // 每个转动：轴、哪一层（null = 整个魔方）、顺时针对应的四分之一圈数
  const MOVE_DEF = {
    U: [1, 1, -1], D: [1, -1, 1], R: [0, 1, -1], L: [0, -1, 1], F: [2, 1, -1], B: [2, -1, 1],
    y: [1, null, -1], x: [0, null, -1], z: [2, null, -1],
  };

  function parse(tok) {
    const d = MOVE_DEF[tok[0]];
    if (!d) throw new Error("不认识的转动 " + tok);
    const mult = tok.endsWith("2") ? 2 : tok.endsWith("'") ? -1 : 1;
    return { face: tok[0], axis: d[0], layer: d[1], q: d[2] * mult };
  }

  const PERM_CACHE = {};
  function perm(tok) {
    if (PERM_CACHE[tok]) return PERM_CACHE[tok];
    const m = parse(tok);
    const to = LOCS.map((l, i) => {
      if (m.layer !== null && l.p[m.axis] !== m.layer) return i;
      return LOC_INDEX[key(rot(l.p, m.axis, m.q), faceOf(rot(NORMAL[l.n], m.axis, m.q)))];
    });
    return (PERM_CACHE[tok] = to);
  }

  function tokens(alg) {
    if (Array.isArray(alg)) return alg;
    return alg.trim() ? alg.trim().split(/\s+/) : [];
  }

  // 状态：s[位置] = 贴纸编号（贴纸编号 = 还原时它所在的位置）
  const SOLVED = LOCS.map((_, i) => i);
  function apply(s, alg) {
    for (const t of tokens(alg)) {
      const to = perm(t);
      const n = new Array(54);
      for (let i = 0; i < 54; i++) n[to[i]] = s[i];
      s = n;
    }
    return s;
  }

  function invert(alg) {
    return tokens(alg).slice().reverse().map(t => t.endsWith("2") ? t : t.endsWith("'") ? t[0] : t + "'");
  }

  const colorAt = (s, f, p) => LOCS[s[LOC_INDEX[key(p, f)]]].n;
  const center = (s, f) => colorAt(s, f, NORMAL[f]);
  function pieceAt(s, p) {
    const out = {};
    for (const f of FACES) { const i = LOC_INDEX[key(p, f)]; if (i !== undefined) out[f] = LOCS[s[i]].n; }
    return out;
  }
  // 这个位置上是哪一块（用它还原时的位置当名字）
  function cubieAt(s, p) {
    for (const f of FACES) { const i = LOC_INDEX[key(p, f)]; if (i !== undefined) return key(LOCS[s[i]].p); }
  }
  function isSolved(s) {
    return FACES.split("").every(f => LOCS.every((l, i) => l.n !== f || LOCS[s[i]].n === center(s, f)));
  }

  // ---------- 七步解法 ----------
  const UF = [0, 1, 1], UR = [1, 1, 0], UB = [0, 1, -1], UL = [-1, 1, 0];
  const UFR = [1, 1, 1];
  const DFR = [1, -1, 1], FR = [1, 0, 1];
  const SEXY = "R U R' U'";
  const RIGHT = "U R U' R' U' F' U F";
  const LEFT = "U' L' U L U F U' F'";
  const CROSS = "F R U R' U' F'";
  const SUNE = "R U R' U R U2 R' U";
  const CORNERS = "U R U' L' U R' U' L";
  const TWIST = "R' D' R D";
  const ALGS = { SEXY, RIGHT, LEFT, CROSS, SUNE, CORNERS, TWIST };
  const SIDE = [[UF, "F"], [UR, "R"], [UB, "B"], [UL, "L"]];
  const ORDER = [0, 1, 3, 2]; // 先试不用转、再转一下、反转一下、最后转两下
  const U_TOK = ["", "U", "U2", "U'"];
  const Y_TOK = ["", "y", "y2", "y'"];
  const turn = (t, k) => (k ? [t[k]] : []);
  const same = (a, b) => a.slice().sort().join() === b.slice().sort().join();
  const cn = c => COLOR_NAME[c];

  function solve(start) {
    let s = start;
    const segs = [];
    function seg(stage, text, toks, focus) {
      toks = tokens(toks);
      s = apply(s, toks);
      segs.push({ stage, text, tokens: toks, focus: focus || [] });
    }
    const repeat = (alg, n) => Array(n).fill(alg).join(" ");

    // 1a 小雏菊：4 块白棱转到黄心旁边，白色朝上
    const isPetal = (t, p) => colorAt(t, "U", p) === "D";
    const petals = t => SIDE.filter(([p]) => isPetal(t, p)).map(([p]) => cubieAt(t, p));
    const MOVES = [];
    for (const f of "URFLBD") for (const m of ["", "'", "2"]) MOVES.push(f + m);
    for (let guard = 0; petals(s).length < 4; guard++) {
      if (guard > 8) throw new Error("小雏菊没做成");
      const have = petals(s);
      let found = null;
      for (let depth = 1; depth <= 5 && !found; depth++) {
        const path = [];
        (function dfs(t, d) {
          if (found) return;
          if (d === 0) { if (petals(t).length > have.length) found = path.slice(); return; }
          for (const m of MOVES) {
            if (path.length && path[path.length - 1][0] === m[0]) continue;
            path.push(m); dfs(apply(t, [m]), d - 1); path.pop();
            if (found) return;
          }
        })(s, depth);
      }
      const after = apply(s, found);
      const fresh = petals(after).filter(c => !have.includes(c));
      const roomFirst = found[0][0] === "U" && found.length > 1;
      seg("1a",
        (roomFirst ? "先转顶层，把空位让到要上来的地方，" : "") +
        `把白棱块转到顶上，白色朝上。现在有 ${have.length} 片花瓣，做完变成 ${petals(after).length} 片。`,
        found, fresh);
    }

    // 1b 白十字：花瓣对准同色中心，再翻到底下
    for (let n = 0; n < 4; n++) {
      let done = false;
      for (const k of ORDER) {
        for (const u of ORDER) {
          const pre = [...turn(U_TOK, u), ...turn(Y_TOK, k)];
          const t = apply(s, pre);
          if (isPetal(t, UF) && colorAt(t, "F", UF) === center(t, "F")) {
            const c = colorAt(t, "F", UF);
            const parts = [];
            if (u) parts.push(`转顶层，让花瓣的${cn(c)}色对准${cn(c)}色中心`);
            if (k) parts.push(`把${cn(c)}色这面转到前面`);
            parts.push("做 F2，把花瓣翻到底下");
            seg("1b", parts.join("，") + "。", [...pre, "F2"], [cubieAt(t, UF)]);
            done = true; break;
          }
        }
        if (done) break;
      }
      if (!done) throw new Error("白十字没做成");
    }

    // 2 白色角块：放到位置正上方，转到右前，做 R U R' U' 1/3/5 遍
    const cornerDone = t => same(Object.entries(pieceAt(t, DFR)).map(([f, c]) => f + c),
      ["D" + center(t, "D"), "F" + center(t, "F"), "R" + center(t, "R")]);
    for (let guard = 0; ; guard++) {
      if (guard > 12) throw new Error("白面没做成");
      const todo = ORDER.filter(k => !cornerDone(apply(s, turn(Y_TOK, k))));
      if (!todo.length) break;
      let hit = null;
      for (const k of todo) {
        for (const u of ORDER) {
          const pre = [...turn(U_TOK, u), ...turn(Y_TOK, k)];
          const t = apply(s, pre);
          const want = [center(t, "D"), center(t, "F"), center(t, "R")];
          if (same(Object.values(pieceAt(t, UFR)), want)) { hit = { pre, t, u, k, want }; break; }
        }
        if (hit) break;
      }
      if (!hit) {
        const pre = turn(Y_TOK, todo[0]);
        const t = apply(s, pre);
        seg("2", "要找的白角块卡在底层的错位置上了。把它所在的位置转到右前方，先做一遍 R U R' U'，把它弹到顶层。",
          [...pre, ...tokens(SEXY)], [cubieAt(t, DFR)]);
        continue;
      }
      let t = hit.t, n = 0;
      while (!cornerDone(t)) { t = apply(t, SEXY); n++; if (n > 5) throw new Error("角块转不进去"); }
      const name = hit.want.map(cn).join("");
      const parts = [`找到${name}三色的白角块`];
      if (hit.u) parts.push("转顶层把它放到它的位置正上方");
      if (hit.k) parts.push("转整个魔方，让这个位置在右前方");
      parts.push(`做 R U R' U' 共 ${n} 遍，它就归位了`);
      seg("2", parts.join("，") + "。", [...hit.pre, ...tokens(repeat(SEXY, n))], [cubieAt(hit.t, UFR)]);
    }

    // 3 中层棱块：往右放 / 往左放
    const midDone = t => same(Object.entries(pieceAt(t, FR)).map(([f, c]) => f + c),
      ["F" + center(t, "F"), "R" + center(t, "R")]);
    for (let guard = 0; ; guard++) {
      if (guard > 12) throw new Error("第二层没做成");
      const todo = ORDER.filter(k => !midDone(apply(s, turn(Y_TOK, k))));
      if (!todo.length) break;
      let hit = null;
      for (const k of ORDER) {
        for (const u of ORDER) {
          const pre = [...turn(Y_TOK, k), ...turn(U_TOK, u)];
          const t = apply(s, pre);
          const pc = pieceAt(t, UF);
          if (Object.values(pc).includes(center(t, "U")) || pc.F !== center(t, "F")) continue;
          if (pc.U === center(t, "R")) hit = { pre, t, alg: RIGHT, dir: "右" };
          else if (pc.U === center(t, "L")) hit = { pre, t, alg: LEFT, dir: "左" };
          if (hit) break;
        }
        if (hit) break;
      }
      if (!hit) {
        const pre = turn(Y_TOK, todo[0]);
        const t = apply(s, pre);
        seg("3", "顶层没有能用的棱块了，说明有一块卡在中层、放反了。把它转到右前方，做一遍「往右放」把它换出来。",
          [...pre, ...tokens(RIGHT)], [cubieAt(t, FR)]);
        continue;
      }
      const pc = pieceAt(hit.t, UF);
      seg("3",
        `找到顶上没有黄色的棱块（${cn(pc.F)}${cn(pc.U)}）。转一转，让它前面的${cn(pc.F)}色对准${cn(pc.F)}色中心，` +
        `它上面是${cn(pc.U)}色，${cn(pc.U)}色中心在${hit.dir}边，所以做「往${hit.dir}放」。`,
        [...hit.pre, ...tokens(hit.alg)], [cubieAt(hit.t, UF)]);
    }

    // 4 黄十字
    const yellowEdges = t => SIDE.filter(([p]) => colorAt(t, "U", p) === center(t, "U")).map(([, f]) => f);
    for (let guard = 0; ; guard++) {
      if (guard > 4) throw new Error("黄十字没做成");
      const e = yellowEdges(s);
      if (e.length === 4) break;
      if (!e.length) { seg("4", "顶上只有中间一个黄点。直接做一遍 F R U R' U' F'。", CROSS); continue; }
      let u = ORDER.find(u => { const g = yellowEdges(apply(s, turn(U_TOK, u))); return same(g, ["B", "L"]) || same(g, ["L", "R"]); });
      const line = same(yellowEdges(apply(s, turn(U_TOK, u))), ["L", "R"]);
      seg("4", (line ? "顶上是一条黄色直线。转顶层让它横着（左右方向）" : "顶上是黄色的 L 形。转顶层把 L 放到左后方（像钟表的 9 点到 12 点）") +
        "，然后做 F R U R' U' F'。", [...turn(U_TOK, u), ...tokens(CROSS)]);
    }

    // 5 黄十字对色：侧面颜色对准中心
    const matched = t => SIDE.filter(([p, f]) => colorAt(t, f, p) === center(t, f)).map(([, f]) => f);
    for (let guard = 0; ; guard++) {
      if (guard > 4) throw new Error("棱块没对齐");
      let best = 0;
      for (const u of ORDER) if (matched(apply(s, turn(U_TOK, u))).length > matched(apply(s, turn(U_TOK, best))).length) best = u;
      const t0 = apply(s, turn(U_TOK, best));
      const ok = matched(t0);
      if (ok.length === 4) {
        if (best) seg("5", "转一下顶层，四块棱的侧面颜色全部对上了。", turn(U_TOK, best));
        break;
      }
      if (ok.length !== 2) throw new Error("对上的棱块数 = " + ok.length);
      const k = ORDER.find(k => same(matched(apply(t0, turn(Y_TOK, k))), ["B", "R"]));
      if (k !== undefined) {
        seg("5", "转顶层，对上了两块，它们挨着。转整个魔方，让对好的两块在后面和右面，然后做 R U R' U R U2 R' U。",
          [...turn(U_TOK, best), ...turn(Y_TOK, k), ...tokens(SUNE)]);
      } else {
        seg("5", "转顶层，对上的两块是对面的。先随便做一遍 R U R' U R U2 R' U，就会变成挨着的情况。",
          [...turn(U_TOK, best), ...tokens(SUNE)]);
      }
    }

    // 6 角块归位
    const placed = t => same(Object.values(pieceAt(t, UFR)), [center(t, "U"), center(t, "F"), center(t, "R")]);
    for (let guard = 0; ; guard++) {
      if (guard > 5) throw new Error("角块没归位");
      const good = [0, 1, 2, 3].filter(k => placed(apply(s, turn(Y_TOK, k))));
      if (good.length === 4) break;
      if (good.length > 1) throw new Error("位置对的角块数 = " + good.length);
      if (good.length) {
        const k = good[0];
        const t = apply(s, turn(Y_TOK, k));
        seg("6", (k ? "有一个角块位置对了（颜色朝哪边都行）。转整个魔方，把它放到右前上，" : "右前上这个角块位置对了（颜色朝哪边都行），") +
          "做 U R U' L' U R' U' L，其它三个角会轮着换位置。",
          [...turn(Y_TOK, k), ...tokens(CORNERS)], [cubieAt(t, UFR)]);
      } else {
        seg("6", "四个角都不在自己的位置上。先在哪里都行，做一遍 U R U' L' U R' U' L，就会有一个对上。", CORNERS);
      }
    }

    // 7 翻角：R' D' R D 做到黄色朝上，再转顶层换下一个
    for (let i = 0; i < 4; i++) {
      let n = 0, t = s;
      while (colorAt(t, "U", UFR) !== center(t, "U")) { t = apply(t, TWIST); n++; if (n > 4) throw new Error("翻角失败"); }
      const id = cubieAt(s, UFR);
      if (n) seg("7", `右前上的角黄色没朝上。做 R' D' R D 共 ${n} 遍，直到黄色朝上（下面会乱，别怕，最后会自己恢复）。然后只转顶层 U，换下一个角到右前上。`,
        [...tokens(repeat(TWIST, n)), "U"], [id]);
      else seg("7", "右前上这个角黄色已经朝上了。只转顶层 U，换下一个角过来。", ["U"], [id]);
    }
    const u = ORDER.find(u => isSolved(apply(s, turn(U_TOK, u))));
    if (u === undefined) throw new Error("没有还原");
    if (u) seg("7", "最后转一下顶层，完成！", turn(U_TOK, u));
    return segs;
  }

  function scramble(rng, n) {
    rng = rng || Math.random;
    const out = [];
    while (out.length < (n || 20)) {
      const f = "URFDLB"[Math.floor(rng() * 6)];
      if (out.length && out[out.length - 1][0] === f) continue;
      out.push(f + ["", "'", "2"][Math.floor(rng() * 3)]);
    }
    return out;
  }

  function seeded(seed) {
    return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  }

  const api = { LOCS, NORMAL, COLOR_NAME, SOLVED, ALGS, apply, invert, tokens, parse, colorAt, center, pieceAt, cubieAt, isSolved, solve, scramble, seeded, key };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CubeLib = api;
})(this);
