const Docker = require('dockerode')
const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const tar = require('tar-stream')
const { Readable } = require('stream')

const docker = new Docker()

// Language configurations
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
    image: 'openjdk:17-alpine',
    command: ['sh', '-c', 'javac Main.java && java Main'],
    filename: 'Main.java',
    timeout: 45000
  },
  cpp: {
    image: 'gcc:latest',
    command: ['sh', '-c', 'g++ -o main code.cpp && ./main'],
    filename: 'code.cpp',
    timeout: 45000
  },
  go: {
    image: 'golang:1.21-alpine',
    command: ['go', 'run'],
    filename: 'main.go',
    timeout: 30000
  },
  rust: {
    image: 'rust:1.70-alpine',
    command: ['sh', '-c', 'rustc main.rs && ./main'],
    filename: 'main.rs',
    timeout: 60000
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

  const containerId = `sketchscript-exec-${uuidv4()}`
  const startTime = Date.now()
  
  let container
  let output = ''
  let error = ''
  let executionTime = 0

  try {
    // Create tar stream with code
    const tarStream = createTarStream(config.filename, code)

    // Create container
    container = await docker.createContainer({
      Image: config.image,
      Cmd: [...config.command, config.filename],
      name: containerId,
      WorkingDir: '/workspace',
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
      NetworkMode: 'none', // No network access for security
      Memory: 128 * 1024 * 1024, // 128MB memory limit
      CpuQuota: 50000, // 50% CPU limit
      AutoRemove: true, // Auto-remove container after execution
      HostConfig: {
        ReadonlyRootfs: false,
        Tmpfs: {
          '/tmp': 'rw,size=100m,mode=1777'
        }
      }
    })

    // Put code file into container
    await container.putArchive(tarStream, { path: '/workspace' })

    // Start container and capture output
    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true
    })

    // Start the container
    await container.start()

    // Collect output
    const chunks = []
    const errorChunks = []

    stream.on('data', (chunk) => {
      // Docker multiplexes stdout and stderr
      const header = chunk.slice(0, 8)
      const payload = chunk.slice(8)
      
      if (header[0] === 1) { // stdout
        chunks.push(payload)
      } else if (header[0] === 2) { // stderr
        errorChunks.push(payload)
      }
    })

    // Wait for container to finish with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout')), config.timeout)
    })

    const waitPromise = container.wait()

    await Promise.race([waitPromise, timeoutPromise])
    
    // Calculate execution time
    executionTime = Date.now() - startTime

    // Combine output
    output = Buffer.concat(chunks).toString('utf8').trim()
    error = Buffer.concat(errorChunks).toString('utf8').trim()

    // Get container exit code
    const result = await container.inspect()
    const exitCode = result.State.ExitCode

    return {
      success: exitCode === 0,
      output: output || null,
      error: error || null,
      executionTime,
      language,
      exitCode
    }

  } catch (err) {
    executionTime = Date.now() - startTime
    
    if (err.message === 'Execution timeout') {
      error = 'Code execution timed out'
      
      // Try to kill the container if it's still running
      if (container) {
        try {
          await container.kill()
        } catch (killErr) {
          console.error('Error killing container:', killErr)
        }
      }
    } else {
      error = err.message
    }

    return {
      success: false,
      output: output || null,
      error: error || err.message,
      executionTime,
      language,
      exitCode: -1
    }

  } finally {
    // Cleanup: container should auto-remove, but ensure cleanup
    if (container) {
      try {
        await container.remove({ force: true })
      } catch (cleanupErr) {
        // Container might already be removed
        console.log('Container cleanup (expected if auto-removed):', cleanupErr.message)
      }
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