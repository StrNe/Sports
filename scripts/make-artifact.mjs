// Transforme dist-artifact/index.html (document complet) en page d'artifact claude.ai :
// pas de doctype/html/head/body (ajoutés à la publication), <title> et <style> en tête.
import { readFileSync, writeFileSync } from 'node:fs'

const src = readFileSync('dist-artifact/index.html', 'utf8')
const title = src.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? '<title>Foulée</title>'
const styles = [...src.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0])
const scripts = [...src.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0].replace(/\s+crossorigin(="[^"]*")?/, ''))
const head = src.slice(0, src.indexOf('</head>'))
const headScripts = scripts.filter((s) => head.includes(s.slice(0, 200)))
const body = src
  .slice(src.indexOf('<body>') + 6, src.lastIndexOf('</body>'))
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
  .trim()
const classic = headScripts.filter((s) => !/type="module"/.test(s))
const modules = scripts.filter((s) => /type="module"/.test(s))

const page = [title, '<meta name="description" content="Foulée : course, renfo, muscu, courses, records, sommeil et repas, synchronisés avec COROS.">', ...styles, ...classic, body, ...modules].join('\n')
writeFileSync('dist-artifact/foulee.html', page)
console.log(`dist-artifact/foulee.html : ${(page.length / 1024).toFixed(0)} Kio`)
