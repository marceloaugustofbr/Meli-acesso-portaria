// Firestore REST API client for CloudFlare Workers
// Usa Firebase Auth ID token (com isAdmin=true) para autenticar
// nas chamadas REST, respeitando as regras de segurança do Firestore.

export class FirestoreClient {
  constructor(env) {
    this.projectId = env.FIREBASE_PROJECT_ID;
    this.clientEmail = env.FIREBASE_CLIENT_EMAIL;
    this.privateKey = (env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    this.apiKey = env.FIREBASE_API_KEY;
    this.baseUrl = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`;
    this.token = null;
    this.tokenExpiry = 0;
  }

  async _signJwt(payload) {
    const _b64url = (s) => btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    const _b64urlObj = (obj) => _b64url(JSON.stringify(obj));

    const b64Header = _b64urlObj({ alg: 'RS256', typ: 'JWT' });
    const b64Payload = _b64urlObj(payload);
    const signingInput = `${b64Header}.${b64Payload}`;

    const keyData = this._pemToBinary(this.privateKey);
    const key = await crypto.subtle.importKey(
      'pkcs8', keyData,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false, ['sign']
    );

    const signature = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      key, new TextEncoder().encode(signingInput)
    );

    const b64Sig = _b64url(String.fromCharCode(...new Uint8Array(signature)));
    return `${signingInput}.${b64Sig}`;
  }

  async getAccessToken() {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    if (!this.clientEmail || !this.privateKey || !this.apiKey) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);

    // 1. Gera Firebase custom token com isAdmin=true
    const customToken = await this._signJwt({
      iss: this.clientEmail,
      sub: this.clientEmail,
      aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
      iat: now,
      exp: now + 3600,
      uid: 'cloudflare-worker',
      claims: { isAdmin: true },
    });

    // 2. Troca por ID token do Firebase Auth
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Falha ao obter ID token: ${data.error?.message || JSON.stringify(data)}`);
    }

    this.token = data.idToken;
    this.tokenExpiry = Date.now() + (parseInt(data.expiresIn, 10) - 60) * 1000;
    return this.token;
  }

  async _authHeaders() {
    const token = await this.getAccessToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  async getDocument(collection, docId) {
    const headers = await this._authHeaders();
    const url = `${this.baseUrl}/${collection}/${docId}`;
    const response = await fetch(url, { headers });

    if (response.status === 404) return null;
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Firestore GET error: ${response.status} ${err}`);
    }

    const data = await response.json();
    return this._docToObj(data);
  }

  async setDocument(collection, docId, data) {
    const headers = await this._authHeaders();
    const fieldPaths = Object.keys(data).map((k) => `updateMask.fieldPaths=${k}`).join('&');
    const url = `${this.baseUrl}/${collection}/${docId}?${fieldPaths}`;
    const body = {
      name: `${this.baseUrl}/${collection}/${docId}`,
      fields: this._objToFields(data),
    };

    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Firestore SET error: ${response.status} ${err}`);
    }

    return response.json();
  }

  async createDocument(collection, data, docId = null) {
    const headers = await this._authHeaders();
    let url = `${this.baseUrl}/${collection}`;
    if (docId) url += `?documentId=${docId}`;

    const body = { fields: this._objToFields(data) };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Firestore CREATE error: ${response.status} ${err}`);
    }

    return response.json();
  }

  async deleteDocument(collection, docId) {
    const headers = await this._authHeaders();
    const url = `${this.baseUrl}/${collection}/${docId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Firestore DELETE error: ${response.status} ${err}`);
    }
  }

  async listCollection(collection) {
    const headers = await this._authHeaders();
    const allDocs = [];
    let pageToken = null;

    do {
      let url = `${this.baseUrl}/${collection}?pageSize=1000`;
      if (pageToken) {
        url += `&pageToken=${encodeURIComponent(pageToken)}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Firestore LIST error: ${response.status} ${err}`);
      }

      const data = await response.json();
      if (data.documents) {
        allDocs.push(...data.documents);
      }
      pageToken = data.nextPageToken || null;
    } while (pageToken);

    return allDocs;
  }

  async listCollectionObjects(collection) {
    const docs = await this.listCollection(collection);
    return docs.map((doc) => {
      const obj = this._docToObj(doc);
      if (!obj) return null;
      obj._id = doc.name.split('/').pop();
      return obj;
    }).filter(Boolean);
  }

  async queryDocuments(collection, { filters = [], orderBy, limit, offset } = {}) {
    const headers = await this._authHeaders();
    const url = `${this.baseUrl}:runQuery`;

    const query = {
      from: [{ collectionId: collection }],
    };

    if (filters.length > 0) {
      query.where = filters.length === 1
        ? this._buildFilter(filters[0])
        : { compositeFilter: { op: 'AND', filters: filters.map((f) => this._buildFilter(f)) } };
    }

    if (orderBy) {
      const list = Array.isArray(orderBy) ? orderBy : [orderBy];
      query.orderBy = list.map((o) => ({
        field: { fieldPath: o.field },
        direction: o.direction || 'ASCENDING',
      }));
    }

    if (limit != null) query.limit = limit;
    if (offset != null) query.offset = offset;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ structuredQuery: query }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Firestore QUERY error: ${response.status} ${err}`);
    }

    const data = await response.json();
    return (data || [])
      .filter((r) => r.document)
      .map((r) => {
        const obj = this._docToObj(r.document);
        if (obj) obj._id = r.document.name.split('/').pop();
        return obj;
      })
      .filter(Boolean);
  }

  async countDocuments(collection, filters = []) {
    const headers = await this._authHeaders();
    const url = `${this.baseUrl}:runAggregationQuery`;

    const query = {
      from: [{ collectionId: collection }],
    };

    if (filters.length > 0) {
      query.where = filters.length === 1
        ? this._buildFilter(filters[0])
        : { compositeFilter: { op: 'AND', filters: filters.map((f) => this._buildFilter(f)) } };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        structuredAggregationQuery: {
          aggregations: [{ count: {}, alias: 'total' }],
          structuredQuery: query,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Firestore COUNT error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const result = (data || []).find((r) => r.aggregateFields);
    if (result?.aggregateFields?.total?.integerValue != null) {
      return parseInt(result.aggregateFields.total.integerValue, 10);
    }
    return 0;
  }

  _buildFilter({ field, op, value }) {
    const opMap = {
      '==': 'EQUAL',
      '!=': 'NOT_EQUAL',
      '>': 'GREATER_THAN',
      '>=': 'GREATER_THAN_OR_EQUAL',
      '<': 'LESS_THAN',
      '<=': 'LESS_THAN_OR_EQUAL',
      'in': 'IN',
      'not-in': 'NOT_IN',
      'array-contains': 'ARRAY_CONTAINS',
      'array-contains-any': 'ARRAY_CONTAINS_ANY',
    };

    return {
      fieldFilter: {
        field: { fieldPath: field },
        op: opMap[op] || 'EQUAL',
        value: this._toFilterValue(value),
      },
    };
  }

  _toFilterValue(value) {
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'number') {
      return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    }
    if (typeof value === 'boolean') return { booleanValue: value };
    if (value === null) return { nullValue: null };
    if (Array.isArray(value)) {
      return { arrayValue: { values: value.map((v) => this._toFilterValue(v)) } };
    }
    if (value instanceof Date) return { timestampValue: value.toISOString() };
    return { stringValue: String(value) };
  }

  _docToObj(doc) {
    if (!doc || !doc.fields) return null;
    const result = {};
    for (const [key, value] of Object.entries(doc.fields)) {
      if (value.stringValue !== undefined) result[key] = value.stringValue;
      else if (value.integerValue !== undefined) result[key] = parseInt(value.integerValue, 10);
      else if (value.doubleValue !== undefined) result[key] = value.doubleValue;
      else if (value.booleanValue !== undefined) result[key] = value.booleanValue;
      else if (value.timestampValue) result[key] = value.timestampValue;
      else if (value.arrayValue) {
        result[key] = (value.arrayValue.values || []).map((v) => {
          if (v.stringValue !== undefined) return v.stringValue;
          if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
          if (v.mapValue) return this._docToObj(v.mapValue);
          return v;
        });
      } else if (value.mapValue) {
        result[key] = this._docToObj(value.mapValue);
      } else if (value.nullValue !== undefined) {
        result[key] = null;
      }
    }
    return result;
  }

  _objToFields(obj) {
    const fields = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        fields[key] = { nullValue: null };
      } else if (typeof value === 'string') {
        fields[key] = { stringValue: value };
      } else if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          fields[key] = { integerValue: String(value) };
        } else {
          fields[key] = { doubleValue: value };
        }
      } else if (typeof value === 'boolean') {
        fields[key] = { booleanValue: value };
      } else if (Array.isArray(value)) {
        fields[key] = {
          arrayValue: {
            values: value.map((v) => {
              if (typeof v === 'string') return { stringValue: v };
              if (typeof v === 'number') return { integerValue: String(v) };
              if (v === null) return { nullValue: null };
              if (typeof v === 'object') return { mapValue: { fields: this._objToFields(v) } };
              return { stringValue: String(v) };
            }),
          },
        };
      } else if (typeof value === 'object') {
        fields[key] = { mapValue: { fields: this._objToFields(value) } };
      }
    }
    return fields;
  }

  _pemToBinary(pem) {
    const b64 = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
