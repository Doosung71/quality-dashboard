# ITP 샘플 파일 디렉토리

이 폴더는 ITP(Inspection and Test Plan) 자동 생성 기능 개발 및 테스트 시 참조하는 실제 샘플 문서 보관소다.

## 포함 파일 목록

| 파일명 | 프로젝트 | 전압 | 문서 유형 | 비고 |
|--------|--------|------|---------|------|
| `GTC1266-FAT-Procedure-ITP-220kV.pdf` | GTC/1266D/2025 (Qatar Dukhan Solar) | 220kV | FAT Procedure + ITP | Rev.1, 2026-05-11 |
| `GTC1288-ITP-400kV.pdf` | GTC/1288/2025 (Qatar) | 400kV | ITP Only | Rev.0, 2026-06-01 |

> **주의**: 위 PDF 파일은 기밀 문서이므로 git 커밋 대상에서 제외됩니다 (`.gitignore` 참조).  
> 개발자는 Dennis에게 파일을 직접 수령하여 이 폴더에 배치하세요.

## 구조 분석 참조

샘플에서 추출한 ITP 구조 상세는 [`itp-structure-reference.md`](./itp-structure-reference.md)를 확인하세요.

## 사용 목적

1. **AI 프롬프트 설계**: ITP 컬럼 구조와 값 패턴을 Claude API 프롬프트에 반영
2. **출력 검증**: 자동 생성된 ITP가 실제 LS전선 형식과 일치하는지 비교
3. **테스트 케이스**: E2E 테스트 시 예상 출력의 golden file로 활용
