# 주소 검색 캡쳐 도구 (Juso Capture Utility)

주소검색 사이트(juso.go.kr)에서 주소를 검색하고 결과를 자동으로 캡쳐하는 Playwright 기반 도구입니다.

## 설치

```bash
npm install
npx playwright install
```

## 사용 방법

### 1. CLI에서 직접 사용

```bash
# 기본 사용법
node utilJusoCapture.js "강남구 테헤란로"

# 파일명 지정
node utilJusoCapture.js "서울시 종로구" "종로구_검색"

# npm 스크립트 사용
npm run capture "강남구 테헤란로"
```

### 2. 코드에서 모듈로 사용

```javascript
const { JusoCapture } = require('./utilJusoCapture');

async function main() {
    const jusoCapture = new JusoCapture();
    
    // 간단한 사용법
    await jusoCapture.searchAndCapture('강남구 테헤란로');
    
    // 세부 옵션 설정
    await jusoCapture.searchAndCapture('서울시 종로구', '종로구_주소검색', {
        outputDir: 'my_captures',
        captureFullPage: true,
        captureResultOnly: true
    });
}

main();
```

### 3. 예제 실행

```bash
npm run example
```

## 기능

- **자동 주소 검색**: 주어진 키워드로 주소 검색 사이트에서 자동 검색
- **스크린샷 캡쳐**: 검색 결과를 이미지로 저장
- **전체 페이지 캡쳐**: 페이지 전체를 스크린샷으로 저장
- **검색 결과만 캡쳐**: 검색 결과 영역만 따로 캡쳐
- **타임스탬프 자동 추가**: 파일명에 자동으로 시간 정보 추가
- **커스텀 설정**: 출력 디렉토리, 파일명 등 설정 가능

## 출력 파일

캡쳐된 이미지는 기본적으로 `screenshots` 폴더에 저장됩니다:
- `{검색어}_{타임스탬프}.png` - 전체 페이지 캡쳐
- `{검색어}_result_{타임스탬프}.png` - 검색 결과 영역만 캡쳐

## 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `outputDir` | string | 'screenshots' | 저장할 디렉토리 |
| `captureFullPage` | boolean | true | 전체 페이지 캡쳐 여부 |
| `captureResultOnly` | boolean | true | 검색 결과만 캡쳐 여부 |

## 주의사항

- 브라우저가 자동으로 실행되므로 네트워크 연결이 필요합니다
- 사이트 구조 변경 시 동작하지 않을 수 있습니다
- Windows 환경에서 테스트되었습니다

## 라이센스

ISC