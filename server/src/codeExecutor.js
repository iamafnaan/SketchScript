const Docker = require('dockerode')
const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const tar = require('tar-stream')
const { Readable } = require('stream')

const docker = new Docker()

// Language configurations (ARM64 compatible)
const languageConfigs = {
  javascript: {
    image: 'node:18-alpine',
    command: ['node'],
    filename: 'code.js',
    timeout: 30000
  },
  python: {
    image: 'python:3.11-alpine',
    command: ['python'],
    filename: 'code.py',
    timeout: 30000
  },
  java: {
    image: 'amazoncorretto:11-alpine',
    command: ['sh', '-c', 'javac Main.java && java Main'],
    filename: 'Main.java',
    timeout: 45000
  },
  cpp: {
    image: 'alpine:latest',
    command: ['sh', '-c', 'apk add --no-cache g++ && g++ -o main code.cpp && ./main'],
    filename: 'code.cpp',
    timeout: 60000
  },
  go: {
    image: 'golang:1.21-alpine',
    command: ['go', 'run'],
    filename: 'main.go',
    timeout: 30000
  },
  rust: {
    image: 'alpine:latest',
    command: ['sh', '-c', 'apk add --no-cache rust cargo && rustc main.rs && ./main'],
    filename: 'main.rs',
    timeout: 90000
  }
}

// Create a tar stream with the code file
function createTarStream(filename, code) {
  const pack = tar.pack()
  pack.entry({ name: filename }, code)
  pack.finalize()
  return pack
}

// Execute code in Docker container
async function executeCode(code, language) {
  const config = languageConfigs[language]
  if (!config) {
    throw new Error(`Unsupported language: ${language}`)
  }

  const startTime = Date.now()
  let output = ''
  let error = ''
  let executionTime = 0

  try {
    // Create tar stream with code
    const tarStream = createTarStream(config.filename, code)

    // Create container with simpler configuration
    const container = await docker.createContainer({
      Image: config.image,
      Cmd: [...config.command, config.filename],
      WorkingDir: '/workspace',
      AttachStdout: true,
      AttachStderr: true,
      NetworkMode: 'none',
      Memory: 128 * 1024 * 1024,
      AutoRemove: true,
    })

    // Put code file into container
    await container.putArchive(tarStream, { path: '/workspace' })

    // Start container and get stream
    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
      logs: true
    })

    await container.start()

    // Collect output with proper parsing
    return new Promise((resolve, reject) => {
      const chunks = []
      const errorChunks = []

      stream.on('data', (chunk) => {
        // Docker stream format: first 8 bytes are header
        if (chunk.length > 8) {
          const header = chunk.readUInt8(0)
          const payload = chunk.slice(8)
          
          if (header === 1) { // stdout
            chunks.push(payload)
          } else if (header === 2) { // stderr
            errorChunks.push(payload)
          }
        }
      })

      stream.on('end', () => {
        executionTime = Date.now() - startTime
        output = Buffer.concat(chunks).toString('utf8').trim()
        error = Buffer.concat(errorChunks).toString('utf8').trim()

        resolve({
          success: !error || error.length === 0,
          output: output || 'Code executed successfully',
          error: error || null,
          executionTime,
          language,
          exitCode: 0
        })
      })

      // Timeout handling
      setTimeout(() => {
        resolve({
          success: false,
          output: null,
          error: 'Execution timeout',
          executionTime: Date.now() - startTime,
          language,
          exitCode: -1
        })
      }, config.timeout)
    })

  } catch (err) {
    executionTime = Date.now() - startTime
    
    return {
      success: false,
      output: null,
      error: err.message,
      executionTime,
      language,
      exitCode: -1
    }
  }
}

// Pull required Docker images
async function pullImages() {
  console.log('Pulling Docker images for code execution...')
  
  for (const [language, config] of Object.entries(languageConfigs)) {
    try {
      console.log(`Pulling ${config.image} for ${language}...`)
      
      await new Promise((resolve, reject) => {
        docker.pull(config.image, (err, stream) => {
          if (err) return reject(err)
          
          docker.modem.followProgress(stream, (err, output) => {
            if (err) return reject(err)
            resolve(output)
          })
        })
      })
      
      console.log(`✓ ${config.image} pulled successfully`)
    } catch (error) {
      console.error(`✗ Failed to pull ${config.image}:`, error.message)
    }
  }
  
  console.log('Docker image pulling completed')
}

// Check Docker availability
async function checkDockerAvailability() {
  try {
    await docker.ping()
    console.log('Docker is available and responding')
    return true
  } catch (error) {
    console.error('Docker is not available:', error.message)
    return false
  }
}

// Get supported languages
function getSupportedLanguages() {
  return Object.keys(languageConfigs)
}

// Initialize code executor
async function initialize() {
  const dockerAvailable = await checkDockerAvailability()
  
  if (!dockerAvailable) {
    throw new Error('Docker is required for code execution but is not available')
  }
  
  // Pull images in background (don't wait)
  pullImages().catch(error => {
    console.error('Error pulling Docker images:', error)
  })
  
  return true
}

module.exports = {
  executeCode,
  initialize,
  pullImages,
  checkDockerAvailability,
  getSupportedLanguages,
  languageConfigs
} 