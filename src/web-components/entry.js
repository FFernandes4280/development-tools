import r2wc from '@r2wc/react-to-web-component'
import JsonMakePretty from '../JsonMakePretty.jsx'

const JsonFormatterWebComponent = r2wc(JsonMakePretty)

customElements.define('json-formatter', JsonFormatterWebComponent)
