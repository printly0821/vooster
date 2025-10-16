export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: 'basic' | 'scan' | 'permission' | 'troubleshoot';
}

export const FAQ_DATA: FAQ[] = [
  {
    id: 'basic-1',
    category: 'basic',
    question: '이 앱은 어떻게 사용하나요?',
    answer:
      '바코드를 카메라로 스캔하면 해당 주문 정보가 자동으로 조회됩니다. 주문 이미지, 상세 정보, 옵션 등을 확인할 수 있습니다.',
  },
  {
    id: 'basic-2',
    category: 'basic',
    question: '온보딩 튜토리얼을 다시 보려면?',
    answer:
      '우측 상단의 "?" 아이콘을 클릭하여 도움말을 열고, "온보딩 다시 보기" 버튼을 클릭하세요.',
  },
  {
    id: 'scan-1',
    category: 'scan',
    question: '바코드 스캔이 잘 안 돼요',
    answer:
      '바코드가 화면 중앙의 가이드 영역에 오도록 위치시키세요. 적절한 거리를 유지하고, 밝은 조명 아래에서 스캔하면 성공률이 높아집니다. 어두운 환경에서는 플래시를 켜보세요.',
  },
  {
    id: 'scan-2',
    category: 'scan',
    question: '플래시를 켜려면 어떻게 하나요?',
    answer:
      '카메라 화면에서 플래시 아이콘을 탭하여 플래시를 켜고 끌 수 있습니다. 어두운 환경에서는 플래시를 켜면 스캔 성공률이 높아집니다.',
  },
  {
    id: 'scan-3',
    category: 'scan',
    question: '여러 개의 바코드가 있을 때는?',
    answer:
      '카메라를 움직여 스캔하고 싶은 바코드만 화면 중앙에 오도록 조준하세요. 앱은 가장 중앙에 있는 바코드를 우선적으로 인식합니다.',
  },
  {
    id: 'permission-1',
    category: 'permission',
    question: '카메라 권한을 허용했는데도 카메라가 작동하지 않아요',
    answer:
      '브라우저를 새로고침하거나, 다른 앱에서 카메라를 사용 중인지 확인해보세요. 여전히 작동하지 않으면 브라우저 설정에서 카메라 권한을 다시 확인하세요.',
  },
  {
    id: 'permission-2',
    category: 'permission',
    question: '실수로 카메라 권한을 거부했어요',
    answer:
      '브라우저 주소창 왼쪽의 자물쇠 아이콘을 클릭하고, 카메라 권한을 "허용"으로 변경한 후 페이지를 새로고침하세요.',
  },
  {
    id: 'permission-3',
    category: 'permission',
    question: 'HTTPS가 아니라는 경고가 나와요',
    answer:
      '카메라 기능은 보안 연결(HTTPS)에서만 작동합니다. HTTPS 주소로 접속하거나, 앱을 설치하여 사용하세요.',
  },
  {
    id: 'troubleshoot-1',
    category: 'troubleshoot',
    question: '주문 정보가 표시되지 않아요',
    answer:
      '네트워크 연결을 확인하세요. 바코드가 올바르게 인식되었는지, 해당 주문이 시스템에 등록되어 있는지 확인이 필요합니다.',
  },
  {
    id: 'troubleshoot-2',
    category: 'troubleshoot',
    question: '이미지가 로딩되지 않아요',
    answer:
      '인터넷 연결 상태를 확인하세요. 느린 네트워크 환경에서는 이미지 로딩에 시간이 걸릴 수 있습니다. 잠시 기다려보시고, 여전히 문제가 있으면 페이지를 새로고침하세요.',
  },
  {
    id: 'troubleshoot-3',
    category: 'troubleshoot',
    question: '최근 내역이 저장되지 않아요',
    answer:
      '브라우저의 쿠키 및 사이트 데이터가 차단되어 있는지 확인하세요. 시크릿 모드에서는 최근 내역이 저장되지 않을 수 있습니다.',
  },
];

export const FAQ_CATEGORIES = {
  basic: '기본 사용법',
  scan: '스캔 방법',
  permission: '권한 문제',
  troubleshoot: '문제 해결',
} as const;
