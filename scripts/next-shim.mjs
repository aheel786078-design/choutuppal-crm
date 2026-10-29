function createResponseCookies(res) {
  return {
    set(nameOrOpts, val, opts = {}) {
      if (typeof nameOrOpts === 'object') {
        const { name, value, path = '/', maxAge, httpOnly, sameSite, secure, expires } = nameOrOpts
        let cookieStr = `${name}=${value}; Path=${path}`
        if (maxAge !== undefined) cookieStr += `; Max-Age=${maxAge}`
        if (expires) cookieStr += `; Expires=${expires.toUTCString()}`
        if (httpOnly) cookieStr += `; HttpOnly`
        if (sameSite) cookieStr += `; SameSite=${sameSite}`
        if (secure) cookieStr += `; Secure`
        res.headers.append('set-cookie', cookieStr)
      } else {
        let cookieStr = `${nameOrOpts}=${val}; Path=${opts.path || '/'}`
        if (opts.maxAge !== undefined) cookieStr += `; Max-Age=${opts.maxAge}`
        if (opts.expires) cookieStr += `; Expires=${opts.expires.toUTCString()}`
        if (opts.httpOnly) cookieStr += `; HttpOnly`
        if (opts.sameSite) cookieStr += `; SameSite=${opts.sameSite}`
        if (opts.secure) cookieStr += `; Secure`
        res.headers.append('set-cookie', cookieStr)
      }
    },
    get(name) {
      const all = res.headers.get('set-cookie') || ''
      const match = all.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
      return match ? { name, value: match[1] } : undefined
    },
    delete(name) {
      res.headers.append('set-cookie', `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`)
    },
  }
}

export class NextResponse extends Response {
  static json(body, init = {}) {
    const headers = new Headers(init.headers || {})
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }
    const res = new Response(JSON.stringify(body), {
      ...init,
      headers,
    })
    res.cookies = createResponseCookies(res)
    return res
  }

  static redirect(url, init = 307) {
    const status = typeof init === 'number' ? init : init.status || 307
    const res = new Response(null, {
      status,
      headers: { Location: typeof url === 'string' ? url : url.toString() },
    })
    res.cookies = createResponseCookies(res)
    return res
  }
}

export class NextRequest extends Request {
  constructor(input, init) {
    super(input, init)
    this.nextUrl = new URL(typeof input === 'string' ? input : input.url)
  }
}

export function cookies() {
  return {
    get: (name) => undefined,
    set: () => {},
    delete: () => {},
    getAll: () => [],
    has: () => false,
  }
}

export default { NextResponse, NextRequest, cookies }
