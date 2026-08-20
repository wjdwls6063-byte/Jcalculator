from __future__ import annotations

import getpass

from backend.app.admin_auth import hash_password


def main() -> None:
    password = getpass.getpass("새 관리자 비밀번호(10자 이상): ")
    confirmation = getpass.getpass("비밀번호 확인: ")
    if password != confirmation:
        raise SystemExit("두 비밀번호가 일치하지 않습니다.")
    print(hash_password(password))


if __name__ == "__main__":
    main()
