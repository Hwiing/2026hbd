// 사진, 질문, 정답, 음악 설정입니다. 편지 본문은 letter.txt에서 수정하세요.
export const content = {
  recipient: '내가 가장 좋아하는 너에게',
  quizzes: [
    {
      before: '우리는 그가 만드신 바라 그리스도 예수 안에서 선한 일을 위하여 지음을 받으진 자니 이 일은 하나님이 전에 ',
      after: '하사 우리로 그 가운데서 행하게 하려 하심이니라.',
      answers: ['예비'],
      initials: 'ㅇㅂ',
      hint: '미리 준비한다는 뜻의 두 글자.',
      citation: '(에베소서 2장 10절)',
    },
    {
      before: '물론 가는 길이 ',
      after: '은 아닐거야\n돌아갈 수도 느리게 갈 수도 있지만',
      answers: ['직선'],
      initials: 'ㅈㅅ',
      hint: '두 점 사이를 곧게 잇는 길, 두 글자.',
    },
  ],
  places: [
    {
      image: new URL('./photo1.jpg', import.meta.url).href,
      alt: '첫 번째 장소 사진',
      answers: ['보드게임카페'],
      initials: 'ㅂㄷㄱㅇㅋㅍ',
    },
    {
      image: new URL('./photo2.jpg', import.meta.url).href,
      alt: '두 번째 장소 사진',
      answers: ['고우즈온'],
      initials: 'ㄱㅇㅈㅇ',
    },
    {
      image: new URL('./photo3.jpg', import.meta.url).href,
      alt: '세 번째 장소 사진',
      answers: ['롯데시티호텔 김포공항'],
      initials: 'ㄹㄷㅅㅌㅎㅌ ㄱㅍㄱㅎ',
    },
    {
      image: new URL('./photo4.jpg', import.meta.url).href,
      alt: '네 번째 장소 사진',
      answers: ['한쿡 서울타워점'],
      initials: 'ㅎㅋ ㅅㅇㅌㅇㅈ',
    },
  ],
  music: {
    scott: { id: 'scott', src: new URL('./audio/scott.mp3', import.meta.url).href, loop: true, volume: .05 },
    clip: { id: 'diff-clip', src: new URL('./audio/diff-clip.wav', import.meta.url).href, loop: false, volume: .65 },
    letter: { id: 'diff-full', src: new URL('./audio/diff.mp3', import.meta.url).href, loop: false, volume: .45 },
  },
  song: {
    correctId: 'diff',
    options: [
      { id: 'diff', image: new URL('./diff.png', import.meta.url).href, label: 'Stardust' },
      { id: 'lala', image: new URL('./lala.png', import.meta.url).href, label: 'La La Land' },
    ],
  },
  digits: ['1', '0', '3', '1'],
}
export const normalize = (value) => value.toLowerCase().replace(/[\s.,!?。♡♥]/g, '').trim()
export const matchesAnswer = (value, answers) => answers.some(answer => normalize(value) === normalize(answer))
export const isUnlocked = (solved, pin) => solved.length === 4 && solved.every(Boolean) && pin === content.digits.join('')
