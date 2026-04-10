document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('chatbot-toggle');
  const chatWindow = document.getElementById('chatbot-window');
  const closeBtn = document.getElementById('chatbot-close');
  const sendBtn = document.getElementById('chatbot-send');
  const inputField = document.getElementById('chatbot-input');
  const messagesContainer = document.getElementById('chatbot-messages');
  const resetBtn = document.getElementById('chatbot-reset');
  const quickReplyBtns = document.querySelectorAll('.quick-reply-btn');

  let isOpen = false;
  // 초기 시스템 프롬프트를 통해 챗봇의 페르소나 설정 및 동아리 정보 주입
  const systemPrompt = `너는 HMBG(How to Make the Best Game) 게임 개발 동아리의 마스코트 '햄부기(🍔)'야.
사용자가 우리 동아리에 대해 물어보면 다음 정보를 바탕으로 정확하게 답변해줘:
- 동아리 소개: 게임 개발을 사랑하는 학생들이 모인 동아리로, 2026년에는 실제 시장에 출시할 수 있는 수준의 게임 제작을 목표로 함.
- 주요 인물:  
  * 회장(동아리장, 대표): 이학주 (RAMIC STUDIO 대표, Unity 게임 2편 스팀 출시, 2025 AI·SW 페스티벌 최우수상 수상)
  * 기획(Planning) 담당: 강주연 (동아리 프로젝트 시스템 운영 및 레벨 기획 운영진. 기획을 맡고 있는 사람은 강주연임)
  * 인사(HR) 담당: 김보민 (동아리 부원 관리 및 네트워킹 운영진. 인사를 맡고 있는 사람은 김보민임)
  * 아트(Art) 담당: 이익선 (프로젝트 아트 기획 및 에셋 제작 운영진. 아트를 맡고 있는 사람은 이익선임)
- 프로젝트: 
  * Flappy Bird: 동아리 첫 프로젝트, Unity 2D 게임.
  * MAYHEM: 2025 SCHU AI·SW 페스티벌 게임개발경진대회 최우수상 수상작 (Unity 3D).
- 주요 활동: 햄부기 게임잼(스토브 출시 목표), 퍼블리싱 및 출시 멘토링, 정기 빌드 데이, 선후배 멘토링.
대답은 항상 친근하고 열정적인 톤으로, 이모지를 듬뿍 써서 답변해줘. 현재 1학기 신입 부원 모집이 모두 마감되었어. 따라서 사용자가 동아리 가입에 대해 물어보면 "현재 1학기 모집은 마감되었어! 너무 아쉽지만 다음 학기(2학기) 모집 기간에 꼭 다시 찾아와줘!"라고 안내해줘. 응답을 너무 길게 하지 말고 요점만 깔끔하게 답변해. 정보를 알려줄 때는 가독성을 위해 마크다운(**굵은 글씨**)을 활용해.`;

  let chatHistory = [
    { role: 'system', content: systemPrompt },
    { role: 'assistant', content: '안녕하세요! HMBG 게임 개발 동아리입니다. 무엇이든 물어보세요! 👋\n(예시: 동아리장이 누구야?, 활동은 어떤 걸 해?)' }
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

  async function typeHTML(element, htmlString, speed) {
    let i = 0;
    while (i < htmlString.length) {
      if (htmlString[i] === '<') {
        let tagEnd = htmlString.indexOf('>', i);
        if (tagEnd !== -1) {
          element.innerHTML = htmlString.substring(0, tagEnd + 1);
          i = tagEnd + 1;
        } else {
          element.innerHTML = htmlString.substring(0, i + 1);
          i++;
        }
      } else if (htmlString[i] === '&') {
        let entityEnd = htmlString.indexOf(';', i);
        if (entityEnd !== -1 && entityEnd - i < 8) {
          element.innerHTML = htmlString.substring(0, entityEnd + 1);
          i = entityEnd + 1;
        } else {
          element.innerHTML = htmlString.substring(0, i + 1);
          i++;
        }
        await new Promise(r => setTimeout(r, speed));
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      } else {
        element.innerHTML = htmlString.substring(0, i + 1);
        i++;
        await new Promise(r => setTimeout(r, Math.random() * speed + speed));
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  }

  function addMessage(text, sender, isTyping = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-msg', sender);

    const textDiv = document.createElement('div');
    textDiv.classList.add('chat-msg-text');

    // 단순 마크다운 및 줄바꿈 처리
    let formattedText = text
      .replace(/</g, '&lt;').replace(/>/g, '&gt;') // XSS 방지
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')       // **볼드**
      .replace(/\*(.*?)\*/g, '<em>$1</em>')                   // *기울임*
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>') // 링크
      .replace(/\n/g, '<br>');                                // 줄바꿈

    msgDiv.appendChild(textDiv);
    messagesContainer.appendChild(msgDiv);

    if (isTyping) {
      typeHTML(textDiv, formattedText, 25);
    } else {
      textDiv.innerHTML = formattedText;
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

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
      // 3. Vercel 서버리스 함수로 요청 전송 (CORS 허용된 API 라우트 호출)
      const response = await fetch('https://hmbg-web.vercel.app/api/chat', {
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
        addMessage(botReply, 'bot', true);
        chatHistory.push({ role: 'assistant', content: botReply });
      } else {
        addMessage('앗, 서버가 이상한 응답을 보냈어요. 잠시 후 다시 시도해주세요!', 'bot', true);
      }
    } catch (err) {
      // 로딩 중 에러 났을 시 처리
      if (loadingMsg.parentNode) {
        loadingMsg.remove();
      }
      addMessage('통신 오류가 발생했어요 😢\n(Vercel에 연동 전이라면 정상입니다)', 'bot', true);
      console.error('Chat error:', err);
    }
  }

  sendBtn.addEventListener('click', sendMessage);

  inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      chatHistory = [
        { role: 'system', content: systemPrompt },
        { role: 'assistant', content: '안녕하세요! HMBG 게임 개발 동아리입니다. 무엇이든 물어보세요! 👋\n(예시: 동아리장이 누구야?, 활동은 어떤 걸 해?)' }
      ];
      messagesContainer.innerHTML = '';
      addMessage('안녕하세요! HMBG 게임 개발 동아리입니다. 무엇이든 물어보세요! 👋\n(예시: 동아리장이 누구야?, 활동은 어떤 걸 해?)', 'bot');
    });
  }

  quickReplyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (inputField.value.trim() === '') {
        inputField.value = btn.textContent;
        sendMessage();
      }
    });
  });
});
