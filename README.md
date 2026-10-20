# MostPomocy — portal i dashboard

Nowy projekt na podstawie wzoru „MostPomocy.pl — Razem łatwiej”: granatowo-niebieska strona, fotografia na moście, 10 kategorii, blog, ogłoszenia, podstrony i ciemny dashboard.

## Co działa w kodzie

- Strona statyczna z pełną treścią HTML: nie zależy od ekranu ładowania ani aplikacji SPA. Każdy artykuł, kategoria i podstrona ma własny adres.
- Responsywny układ, mobilna nawigacja, wyszukiwanie, filtry województwa/kategorii, tryb książkowy i druk artykułu.
- Dashboard edytuje stronę główną, logo, zdjęcie nagłówka, kolor, SEO, kontakt, menu, stopkę, kategorie i ich linki, artykuły, ogłoszenia, podstrony oraz bibliotekę zdjęć.
- Szkice/publikacja, lokalna kopia robocza, import/eksport kopii JSON, podgląd przed publikacją.
- Cloudflare Worker obsługuje zapis do GitHuba, upload obrazów, historię zmian, podgląd stanu GitHub Actions oraz uprawnienia redakcji.
- Każde żądanie do Workera, również bezpośrednio na adres techniczny, wymaga poprawnego JWT Cloudflare Access. Weryfikowane są podpis RS256, issuer, audience, czas ważności i rola konta. Token GitHuba nie trafia do przeglądarki.
- Zapis opiera się na SHA wersji pliku; konflikt nie nadpisuje zdalnych zmian.
- Wykresy dotyczą faktycznych treści. Pomiar odwiedzin wymaga osobnego uruchomienia analityki.

## Co wymaga konfiguracji właściciela

To kod przygotowany do wdrożenia. Nie zawiera poświadczeń i nie oznacza, że logowanie na Twoim koncie Cloudflare jest już uruchomione. Dashboard pod `/admin/?demo=1` jest wyłącznie lokalnym podglądem edycji.

### 1. GitHub Pages — publiczna witryna

1. Po sprawdzeniu zmian scal gałąź portalu do `main`.
2. W repozytorium otwórz **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Workflow `.github/workflows/portal-pages.yml` buduje i publikuje katalog `dist`. Nie wskazuj folderu `site` ani starego `/docs`.
4. Ustaw domenę `mostpomocy.pl` w **Settings → Pages → Custom domain**. Skonfiguruj DNS i HTTPS zgodnie z ekranem GitHub Pages. Nie zmieniaj rekordów poczty.
5. Sprawdź zakończenie workflow oraz stronę `/blog/` i odświeżenie bezpośredniego adresu artykułu.

Repozytorium `mostpomocy.github.io` obsługuje stronę w katalogu głównym. Ten projekt nie jest skonfigurowany dla GitHub Project Pages pod dodatkowym prefiksem `/nazwa-repo/`.

### 2. Cloudflare — panel i logowanie

Publiczna strona pozostaje na GitHub Pages. Tylko dashboard/API działa jako Cloudflare Worker na `admin.mostpomocy.pl`. Dzięki temu logowanie i zapis mają tę samą domenę i nie potrzebują obchodzenia CORS ani przechowywania tokenów w przeglądarce.

1. Lokalnie zbuduj stronę: `npm run build`. W folderze `worker` wykonaj `npm install` oraz `npx wrangler login`.
2. W `worker/wrangler.jsonc` uzupełnij `ADMIN_EMAILS` (właściciel), `CF_ACCESS_TEAM_DOMAIN` (domena zespołu Zero Trust) i `CF_ACCESS_AUD` (Application Audience tag konkretnej aplikacji). `GITHUB_BRANCH` ustaw na gałąź produkcyjną, domyślnie `main`.
3. Utwórz **fine-grained personal access token** GitHuba ograniczony do tego jednego repozytorium: **Contents: Read and write**, **Actions: Read-only**, Metadata: Read. W organizacji może być wymagane zatwierdzenie tokena. Token nie potrzebuje uprawnień do workflow, bo CMS zapisuje wyłącznie treść i obrazy.
4. Dodaj token wyłącznie jako sekret Workera: `npx wrangler secret put GITHUB_TOKEN`. Nie zapisuj go do `site.json`, plików repozytorium ani kodu dashboardu.
5. Uruchom `npx wrangler deploy`. W **Workers & Pages → mostpomocy-dashboard → Settings → Domains & Routes** dodaj Custom Domain `admin.mostpomocy.pl`. Nie ustawiaj jej jako domeny GitHub Pages. Główna domena zostaje przy GitHub Pages.
6. W **Zero Trust → Access → Applications** utwórz aplikację **Self-hosted** dla całego hosta `admin.mostpomocy.pl`, bez ograniczenia do pojedynczej ścieżki. Ustaw politykę Allow dla adresu właściciela i wskazanych redaktorów. Wybierz np. jednorazowy kod e-mail lub dostępnego dostawcę tożsamości. Nie dodawaj polityki Bypass.
7. Skopiuj Application Audience do `CF_ACCESS_AUD`, sprawdź domenę zespołu i wykonaj ponownie `npx wrangler deploy`. Workery bez poprawnego Access/JWT zwracają błąd 401 — to celowe zachowanie zamkniętego dostępu, a nie działające logowanie.
8. Wejdź na `https://admin.mostpomocy.pl/admin/`, zaloguj się i zapisz w **Ustawieniach → Adres panelu Cloudflare**: `https://admin.mostpomocy.pl/admin/`. Opublikuj zmianę.
9. Otwórz panel w prywatnym oknie i upewnij się, że logowanie jest wymagane. Sprawdź nieuprawniony adres e-mail oraz zapis uprawnionego redaktora.

`workers_dev` jest wyłączone. Jeśli włączysz jakąkolwiek inną domenę, Worker nadal weryfikuje JWT, ale objęcie jej Access wymaga osobnej polityki.

### 3. Redakcja i role

Właściciele podani w `ADMIN_EMAILS` mają rolę administratora. Pozostałe role można zarządzać w dashboardzie po dodaniu KV:

1. W `worker` uruchom `npx wrangler kv namespace create CMS_STATE`.
2. Wstaw zwrócony ID do `kv_namespaces` w `wrangler.jsonc`, z bindingiem `CMS_STATE`, i ponownie wdróż Workera.
3. W zakładce **Redakcja** dodaj e-mail i rolę. Ten sam adres musi być dopuszczony w Cloudflare Access. Nie są wysyłane automatyczne zaproszenia.
4. Rola **redaktor** pozwala edytować/publikować treść. Rola **administrator** dodatkowo zarządza redakcją. Rolę właściciela zmienia konfiguracja Cloudflare.

Cloudflare KV jest eventual-consistent: dodanie/odebranie roli może propagować się z opóźnieniem. Pilne odebranie dostępu wykonaj również w Access i unieważnij sesje użytkownika.

### 4. Zwykła edycja

1. Otwórz dashboard i edytuj treść. Automatyczna kopia robocza pozostaje w przeglądarce.
2. Kliknij **Podgląd zmian**, sprawdź stronę i wybierz **Zapisz i opublikuj**.
3. Zapis tworzy commit w repozytorium i uruchamia publikację Pages. Sam zapis nie oznacza jeszcze udanego wdrożenia. Status znajdziesz w **Statystykach → Sprawdź ostatnie publikacje** lub GitHub Actions.
4. Przy konflikcie wyeksportuj kopię, pobierz nowszą treść i połącz zmiany. Zapis nie nadpisze innej wersji bez ostrzeżenia.
5. Zdjęcia przesyłają się osobnym commitem. Ich opis i adresy w artykułach publikuje zapis treści. Usunięcie zdjęcia z biblioteki nie kasuje pliku używanego przez starsze wpisy.

## Ważne ograniczenia treści

Początkowe artykuły to ogólne teksty startowe przygotowane do edycji, a nie przeniesione archiwum poprzedniego portalu. Nie są dodane fikcyjne statystyki, opinie ani ogłoszenia. Zdjęcie nagłówka zostało wygenerowane dla projektu na podstawie kierunku wizualnego ze wzoru. Logo jest nową wektorową interpretacją motywu serca i mostu, nie oryginalnym plikiem źródłowym.

Ogłoszenia od odwiedzających są przygotowywane jako wiadomość e-mail. Użytkownik musi ją wysłać we własnej poczcie, a redakcja ją zatwierdza i wprowadza do panelu. To nie jest publiczny system kont, czat, baza zgłoszeń ani aplikacja do płatności. Newsletter nie został włączony bez wskazania rzeczywistego operatora zapisu. Politykę prywatności należy uzupełnić o dane administratora i rzeczywiste zasady przetwarzania przed uruchomieniem nowych funkcji zbierania danych.

Repozytorium jest publiczne: szkice, historia zmian i załączone zdjęcia również mogą być dostępne w GitHubie. Nie wpisuj danych poufnych ani prywatnych danych użytkowników. Publiczny build usuwa szkice z HTML i `public.json`, ale nie usuwa ich z historii repozytorium.

## Uruchomienie lokalne

Wymagany Node 22 lub nowszy i Python 3 dla prostego serwera:

```
npm test
npm run build
npm run preview
```

Otwórz `http://localhost:4173`. Panel demonstracyjny: `http://localhost:4173/admin/?demo=1`.

Nie otwieraj `index.html` bezpośrednio z dysku. Linki `/blog/`, `/assets/` i moduły JS są przeznaczone dla serwera HTTP/HTTPS — uruchomienie przez `file://` jest przyczyną nieprawidłowego otwierania lokalnych katalogów.

Kod widoków: `site/assets/render.js`, treść: `site/content/site.json`, dashboard: `site/admin`, API: `worker/src`. Frontend i testy nie wymagają instalowania zależności. Wrangler instaluje się wyłącznie dla wdrożenia Cloudflare.

## Oficjalna dokumentacja

- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- https://docs.github.com/en/rest/repos/contents
