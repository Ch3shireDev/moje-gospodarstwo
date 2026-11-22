// Minimalny dekoder kafli wektorowych Mapbox Vector Tile (MVT, protobuf) – bez zależności.
// Specyfikacja: https://github.com/mapbox/vector-tile-spec (wersja 2).
// Używany do odczytu wód (rowy, cieki, zbiorniki, mokradła) z kafli OpenFreeMap (dane OpenStreetMap).

class Pbf {
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
  }
  varint() {
    let result = 0;
    let shift = 0;
    let b;
    do {
      b = this.buf[this.pos++];
      result += (b & 0x7f) * 2 ** shift;
      shift += 7;
    } while (b & 0x80);
    return result;
  }
  bytes() {
    const len = this.varint();
    const out = this.buf.subarray(this.pos, this.pos + len);
    this.pos += len;
    return out;
  }
  skip(wire) {
    if (wire === 0) this.varint();
    else if (wire === 1) this.pos += 8;
    else if (wire === 2) this.pos += this.varint();
    else if (wire === 5) this.pos += 4;
    else throw new Error(`MVT: nieznany typ pola ${wire}`);
  }
  /** Iteracja po polach wiadomości: fn(tag, wire). */
  fields(end, fn) {
    while (this.pos < end) {
      const key = this.varint();
      fn(key >> 3, key & 7);
    }
  }
}

const zigzag = (n) => (n % 2 === 0 ? n / 2 : -(n + 1) / 2);

function packed(pbf) {
  const end = pbf.varint() + pbf.pos;
  const out = [];
  while (pbf.pos < end) out.push(pbf.varint());
  return out;
}

function readValue(pbf) {
  const end = pbf.varint() + pbf.pos;
  let v = null;
  pbf.fields(end, (tag, wire) => {
    if (tag === 1) v = new TextDecoder().decode(pbf.bytes());
    else if (tag === 2) {
      v = new DataView(pbf.buf.buffer, pbf.buf.byteOffset, pbf.buf.byteLength).getFloat32(pbf.pos, true);
      pbf.pos += 4;
    } else if (tag === 3) {
      v = pbf.buf.readDoubleLE(pbf.pos);
      pbf.pos += 8;
    } else if (tag === 4 || tag === 5) v = pbf.varint();
    else if (tag === 6) v = zigzag(pbf.varint());
    else if (tag === 7) v = !!pbf.varint();
    else pbf.skip(wire);
  });
  return v;
}

/** Geometria: lista pierścieni / linii w układzie kafla (0..extent). */
export function decodeGeometry(cmds) {
  const lines = [];
  let line = null;
  let x = 0;
  let y = 0;
  for (let i = 0; i < cmds.length; ) {
    const c = cmds[i++];
    const id = c & 7;
    const count = c >> 3;
    if (id === 1 || id === 2) {
      for (let k = 0; k < count; k++) {
        x += zigzag(cmds[i++]);
        y += zigzag(cmds[i++]);
        if (id === 1) {
          line = [];
          lines.push(line);
        }
        line.push([x, y]);
      }
    } else if (id === 7 && line?.length) {
      line.push([...line[0]]);
    }
  }
  return lines;
}

/** Dekoduje kafel: { [nazwaWarstwy]: { extent, features: [{ id, type, props, geometry }] } }. Tylko wybrane warstwy. */
export function decodeTile(buf, wanted = null) {
  const pbf = new Pbf(buf instanceof Uint8Array ? buf : new Uint8Array(buf));
  const layers = {};
  pbf.fields(pbf.buf.length, (tag, wire) => {
    if (tag !== 3) return pbf.skip(wire);
    const end = pbf.varint() + pbf.pos;
    const layer = { name: '', extent: 4096, keys: [], values: [], raw: [] };
    pbf.fields(end, (t, w) => {
      if (t === 1) layer.name = new TextDecoder().decode(pbf.bytes());
      else if (t === 2) layer.raw.push(pbf.bytes());
      else if (t === 3) layer.keys.push(new TextDecoder().decode(pbf.bytes()));
      else if (t === 4) layer.values.push(readValue(pbf));
      else if (t === 5) layer.extent = pbf.varint();
      else pbf.skip(w);
    });
    if (wanted && !wanted.includes(layer.name)) return;
    layers[layer.name] = {
      extent: layer.extent,
      features: layer.raw.map((bytes) => {
        const f = new Pbf(bytes);
        const feat = { id: null, type: 0, props: {}, cmds: [] };
        f.fields(bytes.length, (ft, fw) => {
          if (ft === 1) feat.id = f.varint();
          else if (ft === 2) {
            const tags = packed(f);
            for (let i = 0; i + 1 < tags.length; i += 2) feat.props[layer.keys[tags[i]]] = layer.values[tags[i + 1]];
          } else if (ft === 3) feat.type = f.varint();
          else if (ft === 4) feat.cmds = packed(f);
          else f.skip(fw);
        });
        return { id: feat.id, type: feat.type, props: feat.props, geometry: decodeGeometry(feat.cmds) };
      }),
    };
  });
  return layers;
}

/** Współrzędne kafla -> WGS84 (Web Mercator). */
export function tilePointToLonLat(z, x, y, px, py, extent) {
  const n = 2 ** z;
  const lon = ((x + px / extent) / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + py / extent)) / n))) * 180) / Math.PI;
  return [lon, lat];
}

export function lonLatToTile(lon, lat, z) {
  const n = 2 ** z;
  const r = (lat * Math.PI) / 180;
  return {
    x: Math.floor(((lon + 180) / 360) * n),
    y: Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n),
  };
}
