import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import consola from 'consola'

const POSTS_DIR = path.resolve('src/content/posts')
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkPosts()
}

function checkPosts(): void {
  const posts = collectPosts()
  let errors = 0

  consola.start(`检查 ${posts.length} 篇文章`)

  for (const post of posts) {
    if (post.fileName !== 'index.md' && post.fileName !== 'index.mdx') {
      consola.error(`${post.id}: 正文必须是 index.md / index.mdx`)
      errors++
    }
    if (!SLUG_RE.test(post.slug)) {
      consola.error(`${post.id}: 目录名要用小写英文数字加连字符，当前是「${post.slug}」`)
      errors++
    }
  }

  if (errors > 0) {
    consola.error(`检查结束：${errors} 个 error`)
    process.exit(1)
  }

  consola.success(`检查 ${posts.length} 篇文章：0 个 error`)
}

function collectPosts() {
  if (!fs.existsSync(POSTS_DIR))
    return []

  return fs.readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(POSTS_DIR, entry.name)
      const fileName = ['index.md', 'index.mdx'].find(name => fs.existsSync(path.join(dir, name))) ?? 'missing'
      return {
        id: `${entry.name}/${fileName}`,
        slug: entry.name,
        fileName,
      }
    })
}
