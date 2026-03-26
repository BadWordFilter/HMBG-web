document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('chatbot-toggle');
  const chatWindow = document.getElementById('chatbot-window');
  const closeBtn = document.getElementById('chatbot-close');
  const sendBtn = document.getElementById('chatbot-send');
  const inputField = document.getElementById('chatbot-input');
  const messagesContainer = document.getElementById('chatbot-messages');

  let isOpen = false;
  // 초기 시스템 프롬프트를 통해 챗봇의 페르소나를 설정합니다.
  let chatHistory = [
    { role: 'system', content: '너는 HMBG 게임 개발 동아리의 마스코트 햄부기(🍔)야. 대답은 항상 친근하고, 열정적이고, 이모지를 듬뿍 써서 답변해줘. 동아리에 대한 질문이 들어오면 가입을 추천해줘. 글을 너무 길게 쓰지 마.' },
    { role: 'assistant', content: '안녕하세요! HMBG 게임 개발 동아리입니다. 무엇이든 물어보세요! 👋' }
  ];

  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      chatWindow.classList.add('active');
      setTimeout(() => inputField.focus(), 300);
    } else {
      chatWindow.classList.remove('active');
    }
  }

  toggleBtn.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  function addMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-msg', sender);
    
    const textDiv = document.createElement('div');
    textDiv.classList.add('chat-msg-text');
    // 줄바꿈 처리
    textDiv.innerHTML = text.replace(/\n/g, '<br>');
    
    msgDiv.appendChild(textDiv);
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return msgDiv;
  }

  async function sendMessage() {
    const text = inputField.value.trim();
    if (!text) return;

    // 1. 사용자 메시지 UI에 추가
    addMessage(text, 'user');
    chatHistory.push({ role: 'user', content: text });
    inputField.value = '';

    // 2. 로딩 메시지 추가
    const loadingMsg = addMessage('...', 'bot-loading');

    try {
      // 3. Vercel 서버리스 함수로 요청 전송 (/api/chat)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory })
      });

      // 요청 성공시 로딩 메시지 삭제
      loadingMsg.remove();

      if (!response.ok) {
        throw new Error('Server returned error status');
      }

      const data = await response.json();
      
      // 4. 응답 메시지 추출 및 UI에 추가
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const botReply = data.choices[0].message.content;
        addMessage(botReply, 'bot');
        chatHistory.push({ role: 'assistant', content: botReply });
      } else {
        addMessage('앗, 서버가 이상한 응답을 보냈어요. 잠시 후 다시 시도해주세요!', 'bot');
      }
    } catch (err) {
      // 로딩 중 에러 났을 시 처리
      if (loadingMsg.parentNode) {
        loadingMsg.remove();
      }
      addMessage('통신 오류가 발생했어요 😢\n(Vercel에 연동 전이라면 정상입니다)', 'bot');
      console.error('Chat error:', err);
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  
  inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
});
