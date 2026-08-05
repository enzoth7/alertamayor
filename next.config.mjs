const nextConfig = {
  distDir: process.env.ALERTAMAYOR_NEXT_DIST_DIR || ".next",
  outputFileTracingIncludes: {
    "/api/team/facility-candidates/unlocated": [
      "./data/discovery/artigas_department_elepem_public_candidates_2026-08-02.json",
      "./data/discovery/instagram_paysandu_candidates_2026-08-02.json",
      "./data/discovery/manual-ide-geocoding-2026-08-02.json",
    ],
  },
};

export default nextConfig;
