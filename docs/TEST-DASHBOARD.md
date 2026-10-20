# Wdrożenie testowego dashboardu (bez zmiany mostpomocy.pl)

Środowisko docelowe: `mostpomocy2-dashboard-test.pabigor.workers.dev` (Worker) i `mostpomocy2-test.pages.dev` (publiczny podgląd). Nie dodawaj domeny `mostpomocy.pl` ani `admin.mostpomocy.pl`.

1. Upewnij się, że Cloudflare Access chroni **All traffic** dla Workera i że w prywatnym oknie pojawia się logowanie. Po zalogowaniu upewnij się, że ograniczenie dotyczy właściciela.
2. Na zaufanym komputerze z Node.js 22 uruchom z katalogu repozytorium: `npm test && npm run build`.
3. W folderze `worker` wykonaj `npm ci` i `npx wrangler login`.
4. Potwierdź, że w Cloudflare Worker istnieje sekret `GITHUB_TOKEN` z uprawnieniem Contents: Read/Write **tylko dla tego repozytorium**. Nie wklejaj go do plików, terminala z historią ani do czatu. Sprawdź, czy token nie wygasł.
5. Wdróż: `npx wrangler deploy --config wrangler.test.jsonc` (wykonywane z katalogu `worker`). **Uwaga:** Wrangler stosuje zmienne z pliku konfiguracji; zostały umieszczone w tym pliku, żeby nie utracić ustawień Cloudflare Access. Przed wdrożeniem sprawdź konfigurację oraz to, czy GITHUB_TOKEN nadal figuruje jako sekret.
6. Sprawdź `https://mostpomocy2-dashboard-test.pabigor.workers.dev/admin/`, potem `/api/session` po zalogowaniu i zapisz wyłącznie testową zmianę. Zweryfikuj commit w `ipabianczyk/mostpomocy2.github.io`.

**Ważne:** GitHub zapisuje treść w `site/content/site.json`, ale ręcznie przesłana witryna Cloudflare Pages **nie aktualizuje się automatycznie**. Dopóki nie zostanie skonfigurowany oddzielny pipeline wdrożenia strony testowej, publikacja w CMS nie zmieni adresu Pages. Kod API `/api/deployments` oczekuje workflow `portal-pages.yml`, którego jeszcze nie dodano; status publikacji w tym endpointcie będzie niedostępny.

Środowisko testowe zawiera w publicznym repozytorium szkice, więc nie wprowadzaj do niego danych wrażliwych. Weryfikacja kompletności podstron, nagłówków SEO i ścieżek assets wymaga oddzielnego testu po wdrożeniu.
