const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class JusoCapture {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    /**
     * 브라우저를 초기화합니다
     */
    async init() {
        this.browser = await chromium.launch({
            headless: false, // 브라우저를 보이게 설정 (디버깅용)
            slowMo: 50, // 동작 속도 조절
            args: [
                '--window-position=1920,0', // 브라우저 윈도우를 (1920, 0) 위치에 시작
                '--window-size=1920,1080'   // 브라우저 윈도우 크기 설정
            ]
        });
        this.page = await this.browser.newPage();
        
        // 뷰포트 크기 설정
        await this.page.setViewportSize({ width: 1920, height: 1080 });
    }

    /**
     * 주소 검색 사이트에 접속합니다
     */
    async navigateToJusoSite() {
        await this.page.goto('https://www.juso.go.kr/openIndexPage.do');
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * 주소를 검색합니다
     * @param {string} searchKeyword - 검색할 주소 키워드
     */
    async searchAddress(searchKeyword) {
        try {
            console.log(`주소 검색 시작: ${searchKeyword}`);
            
            // 페이지 로딩 완료까지 대기
            await this.page.waitForLoadState('networkidle');
            
            // 검색창 찾기 (여러 가능성을 시도)
            let searchInput;
            const inputSelectors = [
                'input[name="keyword"]',
                'input#keyword', 
                'input[id*="search"]',
                'input[name*="search"]',
                'input.search-input',
                'input[placeholder*="주소"]',
                'input[placeholder*="검색"]',
                'input[type="text"]'
            ];
            
            for (const selector of inputSelectors) {
                try {
                    searchInput = this.page.locator(selector).first();
                    if (await searchInput.isVisible({ timeout: 1000 })) {
                        console.log(`검색창 발견: ${selector}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            if (!searchInput || !(await searchInput.isVisible())) {
                console.log('검색창을 찾을 수 없습니다. 페이지 상태를 확인합니다.');
                await this.debugPageState();
                throw new Error('검색창을 찾을 수 없습니다.');
            }
            
            // 검색창에 키워드 입력
            await searchInput.click();
            await searchInput.clear();
            await searchInput.fill(searchKeyword);
            console.log('검색어 입력 완료');
            
            // 입력 완료 후 약간의 대기
            await this.page.waitForTimeout(500);
            
            // Enter키로 검색 실행 (버튼 클릭보다 안정적)
            console.log('Enter키로 검색을 실행합니다.');
            await searchInput.press('Enter');
            
            // 검색 결과 로딩 대기
            console.log('검색 결과 로딩 대기 중...');
            await this.page.waitForLoadState('networkidle');
            await this.page.waitForTimeout(3000); // 검색 결과 표시 대기
            
            // 검색 결과가 나타났는지 확인
            const possibleResultSelectors = [
                'table',
                '.result',
                '.search-result', 
                '.list',
                '[id*="result"]',
                '[class*="result"]'
            ];
            
            let hasResults = false;
            for (const selector of possibleResultSelectors) {
                try {
                    const resultElement = this.page.locator(selector).first();
                    if (await resultElement.isVisible({ timeout: 2000 })) {
                        console.log(`검색 결과 확인됨: ${selector}`);
                        hasResults = true;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            if (!hasResults) {
                console.warn('검색 결과를 확인할 수 없지만 검색은 수행했습니다.');
            }
            
            console.log(`주소 검색 완료: ${searchKeyword}`);
            return true;
            
        } catch (error) {
            console.error('주소 검색 중 오류 발생:', error);
            
            // 디버깅을 위해 현재 페이지의 HTML 구조 일부 출력
            try {
                const pageContent = await this.page.content();
                console.log('현재 페이지 제목:', await this.page.title());
                console.log('현재 URL:', this.page.url());
            } catch (e) {
                console.error('디버깅 정보 수집 실패:', e);
            }
            
            return false;
        }
    }

    /**
     * 페이지를 캡쳐합니다
     * @param {string} filename - 저장할 파일명 (확장자 제외)
     * @param {string} outputDir - 저장할 디렉토리 (기본값: screenshots)
     */
    async captureScreenshot(filename, outputDir = 'screenshots') {
        try {
            // 디렉토리 생성
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            // 타임스탬프 추가
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fullFilename = `${filename}_${timestamp}.png`;
            const filePath = path.join(outputDir, fullFilename);
            
            // 전체 페이지 스크린샷 촬영
            await this.page.screenshot({
                path: filePath,
                fullPage: true
            });
            
            console.log(`스크린샷 저장 완료: ${filePath}`);
            return filePath;
            
        } catch (error) {
            console.error('스크린샷 저장 중 오류 발생:', error);
            return null;
        }
    }

    /**
     * 페이지의 현재 상태를 디버깅합니다
     */
    async debugPageState() {
        try {
            console.log('\n=== 페이지 상태 디버깅 ===');
            console.log('현재 URL:', this.page.url());
            console.log('페이지 제목:', await this.page.title());
            
            // 입력 요소들 확인
            const inputs = await this.page.locator('input').all();
            console.log(`\n발견된 input 요소 수: ${inputs.length}`);
            for (let i = 0; i < Math.min(inputs.length, 5); i++) {
                const input = inputs[i];
                const type = await input.getAttribute('type') || '';
                const name = await input.getAttribute('name') || '';
                const id = await input.getAttribute('id') || '';
                const placeholder = await input.getAttribute('placeholder') || '';
                console.log(`  ${i+1}. type="${type}" name="${name}" id="${id}" placeholder="${placeholder}"`);
            }
            
            // 버튼 요소들 확인
            const buttons = await this.page.locator('button, input[type="submit"], input[type="button"]').all();
            console.log(`\n발견된 button/submit 요소 수: ${buttons.length}`);
            for (let i = 0; i < Math.min(buttons.length, 5); i++) {
                const button = buttons[i];
                const text = await button.textContent() || '';
                const value = await button.getAttribute('value') || '';
                const onclick = await button.getAttribute('onclick') || '';
                console.log(`  ${i+1}. text="${text}" value="${value}" onclick="${onclick.substring(0, 50)}"`);
            }
            
        } catch (error) {
            console.error('페이지 상태 디버깅 중 오류:', error);
        }
    }



    /**
     * 브라우저를 종료합니다
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    /**
     * 주소 검색 및 캡쳐를 한번에 수행합니다
     * @param {string} searchKeyword - 검색할 주소 키워드
     * @param {string} filename - 저장할 파일명 (기본값: 검색 키워드)
     * @param {Object} options - 추가 옵션
     */
    async searchAndCapture(searchKeyword, filename = null, options = {}) {
        try {
            const {
                outputDir = 'screenshots',
                debug = true // 디버깅 모드 기본값
            } = options;

            // 기본 파일명 설정
            if (!filename) {
                filename = searchKeyword.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_');
            }

            console.log(`\n=== 주소 검색 및 캡쳐 시작 ===`);
            console.log(`검색 키워드: ${searchKeyword}`);
            console.log(`파일명: ${filename}`);
            console.log(`저장 경로: ${outputDir}`);

            // 브라우저 초기화
            await this.init();
            
            // 주소 검색 사이트 접속
            await this.navigateToJusoSite();
            
            // 디버깅: 초기 페이지 스크린샷
            if (debug) {
                await this.captureScreenshot(`${filename}_01_초기페이지`, outputDir);
            }
            
            // 주소 검색
            const searchSuccess = await this.searchAddress(searchKeyword);
            
            // 디버깅: 검색 후 페이지 스크린샷
            if (debug) {
                await this.captureScreenshot(`${filename}_02_검색후`, outputDir);
            }
            
            if (searchSuccess) {
                const capturedFiles = [];
                
                // 전체 페이지 캡쳐
                const fullPagePath = await this.captureScreenshot(`${filename}_최종결과`, outputDir);
                if (fullPagePath) capturedFiles.push(fullPagePath);
                
                console.log(`\n=== 주소 검색 및 캡쳐 완료 ===`);
                console.log(`검색 키워드: ${searchKeyword}`);
                console.log(`저장된 파일:`);
                capturedFiles.forEach(file => console.log(`  - ${file}`));
                
                return {
                    success: true,
                    searchKeyword,
                    capturedFiles
                };
            } else {
                console.error('주소 검색에 실패했습니다.');
                return {
                    success: false,
                    error: '주소 검색 실패'
                };
            }
            
        } catch (error) {
            console.error('주소 검색 및 캡쳐 중 오류 발생:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            // 브라우저 종료
            await this.close();
        }
    }
}

// 사용 예제 함수
async function example() {
    const jusoCapture = new JusoCapture();
    
    try {
        // 예제 1: 기본 사용법
        await jusoCapture.searchAndCapture('강남구 테헤란로');
        
        // 예제 2: 세부 옵션 설정
        await jusoCapture.searchAndCapture('서울시 종로구', '종로구_주소검색', {
            outputDir: 'captures'
        });
        
    } catch (error) {
        console.error('예제 실행 중 오류:', error);
    }
}

// 모듈 내보내기
module.exports = {
    JusoCapture,
    example
};

// CLI에서 직접 실행할 때
if (require.main === module) {
    const searchKeyword = '서울특별시 동대문구 천호대로93길 56 장한평월드메르디앙아파트 제102동 제10층 제1002호';
    
    (async () => {
        const jusoCapture = new JusoCapture();
        await jusoCapture.searchAndCapture(searchKeyword);
    })();
}