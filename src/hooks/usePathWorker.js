/**
 * Web Worker Hook
 * 封裝 Worker 通信邏輯，提供 Promise 接口
 */
import { useState, useCallback, useRef, useEffect } from 'react'

export function usePathWorker() {
    const workerRef = useRef(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [progress, setProgress] = useState(0)
    const [message, setMessage] = useState('')
    const pendingTasks = useRef(new Map())
    const taskIdCounter = useRef(0)

    // 初始化 Worker
    useEffect(() => {
        workerRef.current = new Worker(
            new URL('../workers/pathWorker.js', import.meta.url),
            { type: 'module' }
        )

        workerRef.current.onmessage = (e) => {
            const { type, taskId, progress: prog, message: msg, result, error } = e.data
            const task = pendingTasks.current.get(taskId)

            switch (type) {
                case 'PROGRESS':
                    setProgress(prog)
                    setMessage(msg)
                    if (task?.onProgress) {
                        task.onProgress(prog, msg)
                    }
                    break

                case 'COMPLETE':
                    setIsProcessing(false)
                    setProgress(100)
                    if (task) {
                        task.resolve(result)
                        pendingTasks.current.delete(taskId)
                    }
                    break

                case 'ERROR':
                    setIsProcessing(false)
                    if (task) {
                        task.reject(new Error(error))
                        pendingTasks.current.delete(taskId)
                    }
                    break
            }
        }

        return () => {
            workerRef.current?.terminate()
        }
    }, [])

    // 發送任務到 Worker
    const runTask = useCallback((type, payload, onProgress) => {
        return new Promise((resolve, reject) => {
            const taskId = `task_${++taskIdCounter.current}`

            pendingTasks.current.set(taskId, { resolve, reject, onProgress })
            setIsProcessing(true)
            setProgress(0)
            setMessage('')

            workerRef.current.postMessage({ type, payload, taskId })
        })
    }, [])

    // 快捷方法
    const parseJson = useCallback((jsonString, onProgress) => {
        return runTask('PARSE_JSON', { jsonString }, onProgress)
    }, [runTask])

    const analyzeOverhang = useCallback((pathData, onProgress) => {
        return runTask('ANALYZE_OVERHANG', { pathData }, onProgress)
    }, [runTask])

    const optimizePath = useCallback((pathData, options, onProgress) => {
        return runTask('OPTIMIZE_PATH', { pathData, options }, onProgress)
    }, [runTask])

    const estimateTime = useCallback((pathData, printSettings, machineSettings, onProgress) => {
        return runTask('ESTIMATE_TIME', { pathData, printSettings, machineSettings }, onProgress)
    }, [runTask])

    return {
        isProcessing,
        progress,
        message,
        parseJson,
        analyzeOverhang,
        optimizePath,
        estimateTime,
    }
}
