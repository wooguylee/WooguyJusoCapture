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
            // 검색창 찾기 및 클릭
            const searchInput = this.page.locator('input[name="keyword"], input#keyword, input.search-input, input[placeholder*="주소"], input[placeholder*="검색"]').first();
            
            // 검색창에 키워드 입력
            await searchInput.clear();
            await searchInput.fill(searchKeyword);
            
            // 검색 버튼 찾기 및 클릭
            const searchButton = this.page.locator('button:has-text("검색"), button:has-text("조회"), input[type="submit"], button[type="submit"]').first();
            await searchButton.click();
            
            // 검색 결과 로딩 대기
            await this.page.waitForLoadState('networkidle');
            await this.page.waitForTimeout(2000); // 추가 대기 시간
            
            console.log(`주소 검색 완료: ${searchKeyword}`);
            return true;
            
        } catch (error) {
            console.error('주소 검색 중 오류 발생:', error);
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
     * 검색 결과 영역만 캡쳐합니다
     * @param {string} filename - 저장할 파일명 (확장자 제외)
     * @param {string} outputDir - 저장할 디렉토리 (기본값: screenshots)
     */
    async captureSearchResults(filename, outputDir = 'screenshots') {
        try {
            // 검색 결과 영역 찾기
            const resultArea = this.page.locator('.result, .search-result, .list, .table, .content').first();
            
            if (await resultArea.isVisible()) {
                // 디렉토리 생성
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }
                
                // 타임스탬프 추가
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const fullFilename = `${filename}_result_${timestamp}.png`;
                const filePath = path.join(outputDir, fullFilename);
                
                // 검색 결과 영역만 스크린샷 촬영
                await resultArea.screenshot({
                    path: filePath
                });
                
                console.log(`검색 결과 스크린샷 저장 완료: ${filePath}`);
                return filePath;
            } else {
                console.log('검색 결과 영역을 찾을 수 없습니다. 전체 페이지를 캡쳐합니다.');
                return await this.captureScreenshot(filename, outputDir);
            }
            
        } catch (error) {
            console.error('검색 결과 캡쳐 중 오류 발생:', error);
            return await this.captureScreenshot(filename, outputDir);
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
                captureFullPage = true,
                captureResultOnly = true
            } = options;

            // 기본 파일명 설정
            if (!filename) {
                filename = searchKeyword.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '_');
            }

            // 브라우저 초기화
            await this.init();
            
            // 주소 검색 사이트 접속
            await this.navigateToJusoSite();
            
            // 주소 검색
            const searchSuccess = await this.searchAddress(searchKeyword);
            
            if (searchSuccess) {
                const capturedFiles = [];
                
                // 전체 페이지 캡쳐
                if (captureFullPage) {
                    const fullPagePath = await this.captureScreenshot(filename, outputDir);
                    if (fullPagePath) capturedFiles.push(fullPagePath);
                }
                
                // 검색 결과만 캡쳐
                if (captureResultOnly) {
                    const resultPath = await this.captureSearchResults(filename, outputDir);
                    if (resultPath) capturedFiles.push(resultPath);
                }
                
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
            outputDir: 'captures',
            captureFullPage: true,
            captureResultOnly: true
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
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('사용법: node utilJusoCapture.js "검색할 주소"');
        console.log('예시: node utilJusoCapture.js "강남구 테헤란로"');
        process.exit(1);
    }
    
    const searchKeyword = args[0];
    const filename = args[1] || null;
    
    (async () => {
        const jusoCapture = new JusoCapture();
        await jusoCapture.searchAndCapture(searchKeyword, filename);
    })();
}