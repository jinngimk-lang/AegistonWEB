/**
 * 降级快照注册表（构建期静态导入，勿手改 JSON）。
 *
 * 之所以用**静态 import** 而不是运行期读文件：私有化交付会以
 * `output: 'standalone'` 打包，快照必须被打进产物；同时静态导入让
 * 「快照缺失」在构建期就报错，而不是等到线上 API 挂掉那一刻才发现。
 *
 * JSON 由 `npm run content:snapshot` 生成，`npm run content:snapshot:check`
 * 在 CI 中做漂移检查（spec §11.2.1）。
 */

import about from './about.json';
import aboutCareers from './about-careers.json';
import aboutTeam from './about-team.json';
import home from './home.json';
import insights from './insights.json';
import insightsDetail from './insights-detail.json';
import mediaManifest from './media-manifest.json';
import productAragonteam from './product-aragonteam.json';
import productInkclaw from './product-inkclaw.json';
import productLegallens from './product-legallens.json';
import products from './products.json';
import productsDeployment from './products-deployment.json';
import researchPillars from './research-pillars.json';
import searchIndex from './search-index.json';
import siteNavigation from './site-navigation.json';
import siteRoutes from './site-routes.json';
import siteSettings from './site-settings.json';
import solutionFinance from './solution-finance.json';
import solutionLegalServices from './solution-legal-services.json';
import solutionTelecom from './solution-telecom.json';
import solutionTransportation from './solution-transportation.json';
import solutions from './solutions.json';

const REGISTRY = {
  about,
  'about-careers': aboutCareers,
  'about-team': aboutTeam,
  home,
  insights,
  'insights-detail': insightsDetail,
  'media-manifest': mediaManifest,
  'product-aragonteam': productAragonteam,
  'product-inkclaw': productInkclaw,
  'product-legallens': productLegallens,
  products,
  'products-deployment': productsDeployment,
  'research-pillars': researchPillars,
  'search-index': searchIndex,
  'site-navigation': siteNavigation,
  'site-routes': siteRoutes,
  'site-settings': siteSettings,
  'solution-finance': solutionFinance,
  'solution-legal-services': solutionLegalServices,
  'solution-telecom': solutionTelecom,
  'solution-transportation': solutionTransportation,
  solutions,
} as const;

export type SnapshotKey = keyof typeof REGISTRY;

export function getSnapshot<T>(key: SnapshotKey): T | null {
  const value = REGISTRY[key];
  return (value as T | undefined) ?? null;
}

export const SNAPSHOT_KEYS = Object.keys(REGISTRY) as SnapshotKey[];
