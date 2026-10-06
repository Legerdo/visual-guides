# Sources

이 가이드는 2026-10-07 기준으로 웹 개발 교육자들의 공개 발언과 프로그래밍 교육 연구를 시각적으로 요약한 것이다.

## 독립 웹 개발 교육 생태계

- Mathias Schäfer, *The death of web development education*
  - https://molily.de/web-dev-education/
  - 여러 독립 교육자의 사례와 웹 개발 교육 생태계에 대한 논지를 묶은 원문.
- Axel Rauschmayer, 2ality offline notice
  - https://2ality.com/
  - 2024년에는 생활이 가능했던 도서 수입이 2026년 0이 됐다는 설명과, AI 크롤러 중심 트래픽 때문에 블로그·무료 온라인 도서를 일시적으로 내린 이유.
- Salma Alam-Naylor, *Goodbye, forever, probably.*
  - https://whitep4nth3r.com/blog/goodbye-forever-probably/
  - DevRel의 장기 압박, 개발자 교육과 온라인 활동에서 물러난 배경, Josh W. Comeau의 강좌 매출 관련 발언을 포함한다.
- Simon Willison, *A quote from Josh W. Comeau*
  - https://simonwillison.net/2026/jul/3/josh-w-comeau/
  - Comeau의 2026년 신규 강좌 판매 부진, 기존 강좌 감소, 동료 강좌 제작자들의 `Revenue down 50%+` 발언을 보존한 인용 페이지.
- YAVCHN mirror of *The death of web development education*
  - https://yavchn.parkscomputing.com/story/lobsters/td9dxd
  - 원문에 포함된 Web Dev Simplified/Kyle Cook의 "전년 대비 수입이 절반 수준" 발언을 확인하기 위한 보조 출처.

## AI 크롤링과 유입 구조

- Cloudflare, *The crawl before the fall… of referrals*
  - https://blog.cloudflare.com/ai-search-crawl-refer-ratio-on-radar/
- Cloudflare, *Control content use for AI training*
  - https://blog.cloudflare.com/control-content-use-for-ai-training/

Cloudflare의 crawl-to-refer 지표는 AI 플랫폼이 콘텐츠를 크롤링하는 양과 웹사이트로 돌려보내는 referral 사이에 큰 불균형이 있을 수 있음을 보여준다. 단, native app의 referral은 `Referer` 헤더가 없어 과소집계될 수 있으므로 개별 사이트의 정확한 손실률로 읽으면 안 된다.

## 프로그래밍 교육과 학습 효과

- Bassner et al., *Less stress, better scores, same learning: The dissociation of performance and learning in AI-supported programming education*
  - https://www.sciencedirect.com/science/article/pii/S2666920X25001778
  - TUM CS1의 3-arm RCT (N=275). AI 지원은 과제 수행 성능을 크게 높였지만 개념 학습 평가에서는 유의한 집단 차이가 없었다.
- Noraset et al., *Evaluating lab assistant chatbot on student learning and behaviors in a programming short course*
  - https://www.sciencedirect.com/science/article/pii/S2666920X25001675
  - 통제 실험(N=42)에서 완전한 정답을 바로 주지 않는 Assistant 설계가 unrestricted chatbot보다 pre/post 학습 향상이 컸다.
- *An experimental study of structured generative AI integration to mitigate pedagogical, cognitive, and ethical barriers in programming education*
  - https://www.frontiersin.org/journals/computer-science/articles/10.3389/fcomp.2026.1789829/full
  - 구조화된 GenAI 활용이 프로그래밍 교육에서 고차 사고와 학습 설계에 어떤 영향을 주는지 검토한 2026년 실험 연구.

## Interpretation notes

- 교육자들의 매출·수입 감소는 공개된 **개별 사례/self-report**다. 웹 개발 교육 업계 전체의 매출 감소율로 일반화하지 않는다.
- AI가 중요한 원인이라는 당사자 해석은 존재하지만, 개발자 취업시장·소비심리·플랫폼 알고리즘·콘텐츠 포화 같은 교란변수를 제거한 산업 수준 인과 추정은 아니다.
- 이미지 안의 말풍선과 인용부호 형태 문장은 일부가 **직접 인용이 아닌 요약·연출 문구**다. 출처에 없는 문장을 실제 발언으로 재인용하지 않는다.
- "AI는 학습을 해친다" 또는 "AI는 학습을 향상한다"처럼 단일 방향으로 일반화하지 않는다. 연구 결과는 도구 설계, scaffold 수준, 과제, 학습자 집단, 평가 방식에 따라 달라진다.
