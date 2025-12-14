import { useEffect, useRef, useState } from 'react'

export const useAudioAnalyzer = () => {
    const [isReady, setIsReady] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const dataArrayRef = useRef<Uint8Array | null>(null)
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)

    useEffect(() => {
        const setupAudio = async () => {
            try {
                const sources = await (window as any).electron.ipcRenderer.invoke('get-desktop-sources')
                // Prefer "Screen 1" or "Entire Screen"
                const screenSource = sources.find((s: any) => s.name === 'Screen 1' || s.name === 'Entire Screen' || s.name.includes('Screen')) || sources[0]

                if (!screenSource) {
                    setError('No screen source found. Please ensure screen sharing is available.')
                    return
                }

                const constraints = {
                    audio: {
                        mandatory: {
                            chromeMediaSource: 'desktop'
                        }
                    },
                    video: {
                        mandatory: {
                            chromeMediaSource: 'desktop'
                        }
                    }
                } as any

                const stream = await navigator.mediaDevices.getUserMedia(constraints)

                // Loopback audio capture usually requires the video track to be requested, but we can stop it or ignore it.
                // However, on some systems stopping the video track might stop the stream? 
                // Usually safe to ignore.

                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
                const analyser = audioContext.createAnalyser()
                analyser.fftSize = 512 // 256 data points

                const source = audioContext.createMediaStreamSource(stream)
                source.connect(analyser)

                analyserRef.current = analyser
                dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
                sourceRef.current = source
                audioContextRef.current = audioContext

                setIsReady(true)
            } catch (e) {
                const message = e instanceof Error ? e.message : 'Unknown error'
                setError(`Failed to capture audio: ${message}`)
            }
        }

        setupAudio()

        return () => {
            sourceRef.current?.disconnect()
            audioContextRef.current?.close()
        }
    }, [])

    return { analyser: analyserRef.current, dataArray: dataArrayRef.current, isReady, error }
}

