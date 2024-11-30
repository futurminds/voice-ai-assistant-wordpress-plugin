// voice-chat.js
document.addEventListener('DOMContentLoaded', function() {
    const widget = {
        elements: {
            toggle: document.getElementById('voice-chat-toggle'),
            popup: document.getElementById('voice-chat-popup'),
            close: document.getElementById('voice-chat-close'),
            control: document.getElementById('voice-chat-control'),
            buttonText: document.querySelector('.button-text')
        },
        state: {
            isRecording: false,
            mediaRecorder: null,
            audioChunks: [],
            audioPlayer: new Audio()
        },
        init() {
            // Ensure session ID is generated or retrieved before anything else
            this.generateOrRetrieveSessionId();
            this.bindEvents();
            this.setupRecording();
        },
        generateUUID() {
            // Generate a UUID for session identification
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = (Math.random() * 16) | 0;
                const v = c === 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            });
        },
        generateOrRetrieveSessionId() {
            // Check if session ID already exists in localStorage
            if (!localStorage.getItem('sessionId')) {
                const newSessionId = this.generateUUID();
                localStorage.setItem('sessionId', newSessionId);
                console.log('Generated new session ID:', newSessionId);
            } else {
                console.log('Retrieved existing session ID:', localStorage.getItem('sessionId'));
            }
            // Assign session ID to the state
            this.state.sessionId = localStorage.getItem('sessionId');
        },
        bindEvents() {
            this.elements.toggle.addEventListener('click', () => this.togglePopup());
            this.elements.close.addEventListener('click', () => this.closePopup());
            this.elements.control.addEventListener('click', () => this.handleControlClick());
            
            // Stop recording/playing when popup is closed
            this.elements.close.addEventListener('click', () => this.resetState());
        },
        togglePopup() {
            this.elements.popup.classList.toggle('active');
        },
        closePopup() {
            this.elements.popup.classList.remove('active');
        },
        async setupRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.stream = stream;
            } catch (err) {
                console.error('Error accessing microphone:', err);
                alert('Unable to access microphone. Please check permissions.');
            }
        },
        async handleControlClick() {
            if (this.state.isRecording) {
                this.stopRecording();
            } else if (this.state.audioPlayer.paused) {
                this.startRecording();
            }
        },
        updateButtonState(state) {
            this.elements.control.dataset.state = state;
            this.elements.buttonText.textContent = state.charAt(0).toUpperCase() + state.slice(1);
        },
        startRecording() {
            if (!this.stream) return;
            
            this.state.audioChunks = [];
            this.state.mediaRecorder = new MediaRecorder(this.stream);
            
            this.state.mediaRecorder.ondataavailable = (event) => {
                this.state.audioChunks.push(event.data);
            };
            
            this.state.mediaRecorder.onstop = () => {
                this.processAudioData();
            };
            
            this.state.mediaRecorder.start();
            this.state.isRecording = true;
            this.updateButtonState('listening');
            
            // Add voice activity detection
            this.setupVoiceActivityDetection();
        },
        setupVoiceActivityDetection() {
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(this.stream);
            const processor = audioContext.createScriptProcessor(2048, 1, 1);
            
            let silenceStart = Date.now();
            const SILENCE_THRESHOLD = 1500; // 1.5 seconds of silence
            
            processor.onaudioprocess = (e) => {
                const input = e.inputBuffer.getChannelData(0);
                let sum = 0;
                
                // Calculate average amplitude
                for (let i = 0; i < input.length; i++) {
                    sum += Math.abs(input[i]);
                }
                
                const average = sum / input.length;
                
                if (average < 0.01) { // Silence threshold
                    if (Date.now() - silenceStart > SILENCE_THRESHOLD) {
                        this.stopRecording();
                        source.disconnect();
                        processor.disconnect();
                    }
                } else {
                    silenceStart = Date.now();
                }
            };
            
            source.connect(processor);
            processor.connect(audioContext.destination);
        },
        stopRecording() {
            if (this.state.mediaRecorder && this.state.mediaRecorder.state !== 'inactive') {
                this.state.mediaRecorder.stop();
                this.state.isRecording = false;
                this.updateButtonState('thinking');
            }
        },
        async processAudioData() {
            console.log('processAudioData: Starting audio processing...');
            const audioBlob = new Blob(this.state.audioChunks, { type: 'audio/wav' });
        
            // Log audioBlob details
            console.log('processAudioData: Created audioBlob from recorded chunks.', {
                size: audioBlob.size,
                type: audioBlob.type,
            });
        
            const formData = new FormData();
            formData.append('audio', audioBlob);
            console.log('processAudioData: FormData created with audio blob.');
        
            try {
                const timeout = 20000; // 20 seconds timeout
                console.log('processAudioData: Sending fetch request to webhook with timeout of 60 seconds.');
        
                console.log(this.state.sessionId);
                const response = await Promise.race([
                    fetch(voiceChatAjax.webhookUrl, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'Accept': 'audio/mp3',
                            'Session-ID': this.state.sessionId // Pass session ID in the headers
                        },
                    }),
                    new Promise((_, reject) =>
                        setTimeout(() => {
                            console.error('processAudioData: Request timed out.');
                            reject(new Error('Request timed out'));
                        }, timeout)
                    ),
                ]);
        
                // Log response status and headers
                console.log('processAudioData: Fetch request completed.', {
                    status: response.status,
                    statusText: response.statusText,
                });
        
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('processAudioData: Non-OK response received.', {
                        status: response.status,
                        statusText: response.statusText,
                        errorText,
                    });
                    throw new Error(
                        `Network response was not ok. Status: ${response.status}, Message: ${errorText}`
                    );
                }
        
                console.log('processAudioData: Response is OK. Extracting response blob...');
                const responseBlob = await response.blob();
        
                // Log Blob details
                console.log('processAudioData: Response blob extracted.', {
                    size: responseBlob.size,
                    type: responseBlob.type,
                });
        
                if (responseBlob.size === 0) {
                    console.error('processAudioData: Received empty audio blob from the server.');
                    throw new Error('Received empty audio blob from the server.');
                }
        
                // Play the audio response
                console.log('processAudioData: Playing audio response...');
                this.playResponse(responseBlob);
        
                // Update button state to "tap to talk" after successful playback
                console.log('processAudioData: Audio playback completed. Resetting button state.');
                this.updateButtonState('tap to talk');
            } catch (error) {
                // Catch and log any errors
                console.error('processAudioData: Error occurred during audio processing.', error);
                this.updateButtonState('tap to talk'); // Ensure state resets even on error
            }
        },
        playResponse(audioBlob) {
            const audioUrl = URL.createObjectURL(audioBlob);
        
            // Log the audio URL for debugging
            console.log('Audio URL:', audioUrl);
        
            this.state.audioPlayer.src = audioUrl;
        
            this.state.audioPlayer
                .play()
                .then(() => {
                    console.log('Audio playback started.');
                    this.updateButtonState('speaking');
                })
                .catch((error) => {
                    console.error('Audio playback failed:', error);
                    this.updateButtonState('tap to talk'); // Reset state on playback failure
                })
                .finally(() => {
                    this.updateButtonState('tap to talk'); // Reset state after playback
                });
        },
        resetState() {
            if (this.state.mediaRecorder && this.state.mediaRecorder.state !== 'inactive') {
                this.state.mediaRecorder.stop();
            }
            this.state.audioPlayer.pause();
            this.state.audioPlayer.currentTime = 0;
            this.state.isRecording = false;
            this.updateButtonState('tap to talk');
        }
    };
    
    widget.init();
});