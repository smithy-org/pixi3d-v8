import { GlProgram } from "pixi.js"

/**
 * Makes the sources of a GLSL ES 1.00 (WebGL 1) program valid again after
 * PixiJS v8 has prepared them, before the program is first compiled.
 *
 * PixiJS v8 puts a `#define SHADER_NAME` line, a block of WebGL 1 defines
 * and a precision statement at the top of every GLSL ES 1.00 source. GLSL
 * ES 1.00 requires a `#version` directive to come first and extension
 * directives to come before any statement, so a shader with either would
 * not compile. PixiJS v7 left a source that started with a directive alone.
 * The version directive is moved back to the top, and a precision statement
 * above an extension directive down to the first statement after the last
 * one. Sources for GLSL ES 3.00 (WebGL 2) are left as they are.
 * @param program The program to fix.
 */
export function fixGlslEs100Program(program: GlProgram) {
  const sources = <{ vertex: string, fragment: string }><unknown>program
  sources.vertex = fixGlslEs100Source(sources.vertex)
  sources.fragment = fixGlslEs100Source(sources.fragment)
}

const isDirective = (line: string) => line.trim().startsWith("#")
const isPrecision = (line: string) => /^\s*precision\s+\w+\s+float\s*;\s*$/.test(line)

function fixGlslEs100Source(source: string) {
  if (!source || /^\s*#version\s+300\s+es\b/m.test(source)) {
    return source
  }
  const lines = source.split("\n")
  const versionIndex = lines.findIndex(line => /^\s*#version\b/.test(line))
  const version = versionIndex >= 0 ? lines.splice(versionIndex, 1)[0] : undefined

  let lastExtension = -1
  lines.forEach((line, i) => { if (/^\s*#extension\b/.test(line)) lastExtension = i })
  if (lastExtension >= 0) {
    const moved: string[] = []
    for (let i = lastExtension - 1; i >= 0; i--) {
      if (isPrecision(lines[i])) {
        moved.unshift(lines.splice(i, 1)[0])
        lastExtension--
      }
    }
    if (moved.length > 0) {
      lines.splice(firstStatementAfter(lines, lastExtension), 0, ...moved)
    }
  }
  if (version) {
    lines.unshift(version)
  }
  return lines.join("\n")
}

/**
 * Returns the index of the first line after the specified one that is not a
 * directive, a comment or blank.
 */
function firstStatementAfter(lines: string[], index: number) {
  let inComment = false
  for (let i = index + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (inComment) {
      inComment = !line.includes("*/")
      continue
    }
    if (line === "" || isDirective(line) || line.startsWith("//")) {
      continue
    }
    if (line.startsWith("/*")) {
      inComment = !line.includes("*/")
      continue
    }
    return i
  }
  return lines.length
}
