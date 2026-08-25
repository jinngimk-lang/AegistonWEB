# Linux / CI 的便利层。
#
# ⚠️ **不是唯一入口**（spec §7.4 / P1-15）：本项目的开发环境是 Windows，
# 默认没有 make。跨平台的规范入口是 `npm run <task>`（前端与编排）
# 与 `python -m <module>`（后端），两者在三大平台行为一致。
# 下面每条规则的注释里都给出了等价的单行命令。

.PHONY: help install dev api web assets content test lint build up down logs

help:
	@echo "make install   安装前后端依赖"
	@echo "make api       启动 API（等价：python -m uvicorn app.main:app --reload，工作目录 backend/）"
	@echo "make web       启动前端（等价：npm --prefix frontend run dev）"
	@echo "make assets    重新生成图片与字体（PPT 截图 / Unsplash / 字体分片）"
	@echo "make content   校验内容包与磁盘资源"
	@echo "make test      跑全部测试"
	@echo "make lint      lint + typecheck + stylelint"
	@echo "make build     前端生产构建"
	@echo "make up        docker compose up -d"

install:
	python -m pip install -e "backend[dev,assets]"
	npm --prefix frontend ci

api:
	cd backend && python -m uvicorn app.main:app --reload --port 8000

web:
	npm --prefix frontend run dev

assets:
	python -m backend.scripts.extract_pptx_assets --pptx "ref/智瞳安宇-总体产品介绍-V7.pptx" --out-images frontend/public/media/product --out-manifest backend/app/content/media_manifest.json
	npm --prefix frontend run assets:stock
	npm --prefix frontend run fonts:fetch

content:
	python -m backend.scripts.validate_content --content-dir backend/app/content --strict
	python -m backend.scripts.validate_assets

test:
	cd backend && python -m pytest tests -q --cov=app
	npm --prefix frontend run test
	npm --prefix frontend run e2e

lint:
	cd backend && python -m ruff check app scripts tests && python -m mypy app
	npm --prefix frontend run lint
	npm --prefix frontend run typecheck
	npm --prefix frontend run stylelint

build:
	npm --prefix frontend run build

up:
	docker compose -f docker-compose.prod.yml up -d --build

down:
	docker compose -f docker-compose.prod.yml down

logs:
	docker compose -f docker-compose.prod.yml logs -f --tail=100
