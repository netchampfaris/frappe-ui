export function makeGetParams(params: { [key: string]: any }) {
  let url = new URLSearchParams()
  for (let key in params) {
    let value = params[key]
    if (value != null) {
      url.append(key, params[key])
    }
  }
  return url.toString()
}
