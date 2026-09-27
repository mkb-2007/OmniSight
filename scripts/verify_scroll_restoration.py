with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert "history.scrollRestoration = 'manual'" in html, "history.scrollRestoration manual missing"
assert "resetScrollToTop()" in html, "resetScrollToTop() method missing"
assert "behavior: 'instant'" in html, "behavior: instant missing"
assert "$watch('currentView'" in html, "$watch('currentView') missing"
assert "$watch('cityTab'" in html, "$watch('cityTab') missing"
assert "$watch('wardTab'" in html, "$watch('wardTab') missing"
assert "$watch('devTab'" in html, "$watch('devTab') missing"
assert "window.addEventListener('popstate'" in html, "popstate listener missing"

print("ALL SCROLL RESTORATION CHECKS PASSED PERFECTLY!")
