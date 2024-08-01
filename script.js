document.addEventListener('DOMContentLoaded', () => {
    const sendButton = document.getElementById('send-button');
    const userInput = document.getElementById('user-input');
    const chatWindow = document.getElementById('chat-window');

    let trainingData = loadTrainingData();
    let currentUserMessage = null;
    let editingMessageElement = null; // Элемент редактируемого сообщения

    // Обработчики событий
    sendButton.addEventListener('click', () => {
        console.log('Send button clicked');
        sendMessage();
    });

    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            console.log('Enter pressed in user input');
            sendMessage();
        }
    });

    function loadTrainingData() {
        const data = localStorage.getItem('data');
        return data ? JSON.parse(data) : [];
    }

    function saveTrainingData() {
        localStorage.setItem('data', JSON.stringify(trainingData));
    }

    function sendMessage() {
        console.log('sendMessage called');
        if (!editingMessageElement) {
            const message = userInput.value.trim();
            if (message) {
                addMessage('user', message);
                userInput.value = '';
                userInput.style.height = '40px'; // Сброс высоты
        
                if (currentUserMessage) {
                    handleClarification(message);
                } else {
                    showTypingIndicator();
                    const response = getResponse(message);
                    removeTypingIndicator();
                    addMessage('bot', response);
                    if (response === 'Не понимаю вашего запроса. Можете объяснить, как мне ответить?') {
                        currentUserMessage = message;
                    }
                }
            }
        } else {
            const textarea = editingMessageElement.querySelector('textarea');
            if (!textarea) {
                console.error('Не удалось найти элемент textarea внутри editingMessageElement');
                return;
            }
        
            const message = textarea.value.trim();
            if (message) {
                const messageText = document.createElement('span');
                messageText.className = 'message-text';
                messageText.textContent = message;
        
                // Обновляем сообщение
                editingMessageElement.innerHTML = ''; // Очистка содержимого
                const iconElement = document.createElement('span');
                iconElement.className = 'icon';
                iconElement.textContent = 'U'; // Замените 'U' на нужный текст для иконки пользователя
                editingMessageElement.appendChild(iconElement);
                editingMessageElement.appendChild(messageText);
                editingMessageElement.classList.remove('editable');
                editingMessageElement = null; // Сброс редактирования
                showTypingIndicator();
                const response = getResponse(message);
                removeTypingIndicator();
                addMessage('bot', response);
                if (response === 'Не понимаю вашего запроса. Можете объяснить, как мне ответить?') {
                    currentUserMessage = message;
                }
            } else {
                console.error('Пустое сообщение');
            }
        }
    }

    function handleClarification(clarification) {
        updateTrainingData(currentUserMessage, clarification);
        addMessage('bot', 'Спасибо! Я запомнил.');
        currentUserMessage = null;
    }

    function updateTrainingData(userMessage, response) {
        const existingEntry = trainingData.find(entry => entry.input === userMessage);
        if (existingEntry) {
            existingEntry.output = response;
        } else {
            trainingData.push({ input: userMessage, output: response });
        }
        saveTrainingData();
    }

    function performMathOperation(operation) {
        try {
  
            const result = math.evaluate(operation);
            return `Результат: ${result}`;
        } catch (error) {
            return 'Ошибка при выполнении математической операции. Пожалуйста, проверьте ввод.';
        }
    }

    function getResponse(userMessage) {
        userMessage = userMessage.toLowerCase();
        if (/[-+*/^()0-9\s.]+/.test(userMessage) || /integral/i.test(userMessage)) {
            const res = performMathOperation(userMessage);
            if (res !== 'Ошибка при выполнении математической операции. Пожалуйста, проверьте ввод.') {
                return res;
            }
        }
        
        const entry = trainingData.find(item => item.input === userMessage);
        if (entry && entry.output) {
            if (entry.output.startsWith('```python') && entry.output.endsWith('```')) {
                const codeContent = entry.output
                    .replace(/^```python/, '')
                    .replace(/```$/, '');
                return `<pre><code class="language-python">${Prism.highlight(codeContent, Prism.languages.python, 'python')}</code></pre>`;
            }
            return entry.output;
        } else {
            if (!entry) {
                trainingData.push({ input: userMessage, output: '' });
                saveTrainingData();
            }
            return 'Не понимаю вашего запроса. Можете объяснить, как мне ответить?';
        }
    }

    function addMessage(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', sender);
    
        const iconElement = document.createElement('span');
        iconElement.classList.add('icon');
        iconElement.textContent = sender === 'user' ? 'U' : 'B';
    
        const textElement = document.createElement('span');
        textElement.classList.add('message-text');
    
        // Проверяем, содержит ли сообщение код
        if (message.startsWith('```python') && message.endsWith('```')) {
            const codeContent = message
                .replace(/^```python/, '')
                .replace(/```$/, '');
            textElement.innerHTML = `<pre><code class="language-python">${Prism.highlight(codeContent, Prism.languages.python, 'python')}</code></pre>`;
        } else {
            textElement.textContent = message;
        }
    
        messageElement.appendChild(iconElement);
        messageElement.appendChild(textElement);
        chatWindow.appendChild(messageElement);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    
        // Добавляем обработчик двойного клика для редактирования
        messageElement.addEventListener('dblclick', () => {
            if (sender === 'user') {
                startEditing(messageElement);
            }
        });
    
        // Инициируем подсветку кода после добавления сообщения
        Prism.highlightAll();
    }
    
    

    function startEditing(messageElement) {
        editingMessageElement = messageElement;
        const messageText = messageElement.querySelector('.message-text');
        const iconElement = messageElement.querySelector('.icon'); // Сохраняем иконку
    
        if (!messageText) {
            console.error('Не удалось найти элемент с классом .message-text внутри messageElement');
            return;
        }
    
        // Если уже есть textarea, удаляем её и кнопку
        const existingTextarea = messageElement.querySelector('textarea');
        const existingButton = messageElement.querySelector('button');
        if (existingTextarea && existingButton) {
            existingTextarea.remove();
            existingButton.remove();
        }
    
        // Создаем элемент textarea и устанавливаем его значение
        const textarea = document.createElement('textarea');
        textarea.value = messageText.textContent;
    
        // Создаем кнопку "Отправить"
        const sendButton = document.createElement('button');
        sendButton.textContent = 'Отправить';
    
        // Добавляем обработчик клика на кнопку
        sendButton.addEventListener('click', () => {
            console.log('Send button clicked in editing mode');
            sendMessage();
        });
    
        // Добавляем обработчик нажатия клавиши Enter в textarea
        textarea.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                console.log('Enter pressed in textarea');
                sendMessage(); // Отправляем измененное сообщение
            }
        });
    
        // Заменяем текстовое сообщение на textarea и кнопку, сохраняя иконку
        messageElement.innerHTML = ''; // Очистка содержимого
        messageElement.appendChild(iconElement); // Добавляем иконку
        messageElement.appendChild(textarea);
        messageElement.appendChild(sendButton);
        textarea.focus();
    }
    
    

    function showTypingIndicator() {
        const typingElement = document.createElement('div');
        typingElement.classList.add('chat-message', 'bot', 'typing-indicator');
        typingElement.innerHTML = `
            <span class="icon">B</span>
            <span>Печатает...</span>
        `;
        chatWindow.appendChild(typingElement);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function removeTypingIndicator() {
        const typingElement = document.querySelector('.typing-indicator');
        if (typingElement) {
            typingElement.remove();
        }
    }
});
