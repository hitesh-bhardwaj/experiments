import os
import json
import difflib

SLUGS = [
    "butterfly-trail-cursor",
    "character-trail",
    "coffee-bean-cursor",
    "colorful-cursor-aura",
    "cursor-move",
    "fish-eye",
    "full-screen-crosshair",
    "inertia-img",
    "interactive-arrows",
    "liquid-glass-cursor",
    "magnetic-image-trail",
    "noise-ripple-cursor",
    "phantom-image-trail",
    "pixel-bloom",
    "pixelated-image-effect",
    "rope-cursor"
]

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

def get_rel_path(p):
    return os.path.relpath(p, REPO_ROOT)

def analyze_component(slug):
    res = {
        "slug": slug,
        "registry_dir_exists": False,
        "registry_json_exists": False,
        "registry_json_valid": True,
        "registry_json_errors": [],
        "package_json_exists": False,
        "package_json_valid": True,
        "package_json_errors": [],
        "index_jsx_exists": False,
        "index_jsx_content": "",
        "uses_suspended_raf": False,
        "has_event_listeners": False,
        "has_cleanup": False,
        "handles_reduced_motion": False,
        "demo_page_exists": False,
        "demo_page_path": "",
        "src_component_exists": False,
        "src_component_files": [],
        "drift_found": False,
        "drift_details": "",
        "public_json_exists": False,
        "public_json_stale": False,
        "public_json_issues": [],
        "files_checked": []
    }

    reg_dir = os.path.join(REPO_ROOT, "registry", "effects", "cursor", slug)
    if os.path.isdir(reg_dir):
        res["registry_dir_exists"] = True
    else:
        return res

    # 1. registry.json
    reg_json_path = os.path.join(reg_dir, "registry.json")
    reg_data = None
    if os.path.isfile(reg_json_path):
        res["registry_json_exists"] = True
        res["files_checked"].append(get_rel_path(reg_json_path))
        try:
            with open(reg_json_path, 'r', encoding='utf-8') as f:
                reg_data = json.load(f)
            
            # Check fields
            required_fields = ["name", "version", "type", "title", "description", "category", "tier", "dependencies", "registryDependencies", "previewUrl", "main", "exportName", "exportKind", "importPath", "target", "files"]
            for rf in required_fields:
                if rf not in reg_data:
                    res["registry_json_valid"] = False
                    res["registry_json_errors"].append(f"Missing required field: '{rf}'")
            
            if reg_data.get("name") != slug:
                res["registry_json_valid"] = False
                res["registry_json_errors"].append(f"Name '{reg_data.get('name')}' does not match folder '{slug}'")
            
            if reg_data.get("category") != "cursor":
                res["registry_json_valid"] = False
                res["registry_json_errors"].append(f"Category '{reg_data.get('category')}' is not 'cursor'")

            if reg_data.get("tier") not in ["free", "pro"]:
                res["registry_json_valid"] = False
                res["registry_json_errors"].append(f"Tier '{reg_data.get('tier')}' is invalid")

            main_file = reg_data.get("main", "index.jsx")
            main_path = os.path.join(reg_dir, main_file)
            if not os.path.isfile(main_path):
                res["registry_json_valid"] = False
                res["registry_json_errors"].append(f"Main file '{main_file}' does not exist in registry folder")

            # Check files array
            files = reg_data.get("files", [])
            for file_entry in files:
                f_path = file_entry.get("path")
                if not f_path:
                    res["registry_json_valid"] = False
                    res["registry_json_errors"].append("Empty 'path' in files array")
                    continue
                actual_f_path = os.path.join(reg_dir, f_path)
                if not os.path.isfile(actual_f_path):
                    res["registry_json_valid"] = False
                    res["registry_json_errors"].append(f"File listed in files array does not exist: '{f_path}'")
                
        except Exception as e:
            res["registry_json_valid"] = False
            res["registry_json_errors"].append(f"Error parsing registry.json: {str(e)}")
    else:
        res["registry_json_errors"].append("registry.json does not exist")

    # 2. package.json
    pkg_json_path = os.path.join(reg_dir, "package.json")
    if os.path.isfile(pkg_json_path):
        res["package_json_exists"] = True
        res["files_checked"].append(get_rel_path(pkg_json_path))
        try:
            with open(pkg_json_path, 'r', encoding='utf-8') as f:
                pkg_data = json.load(f)
            expected_name = f"@hyperiux/{slug}"
            if pkg_data.get("name") != expected_name:
                res["package_json_valid"] = False
                res["package_json_errors"].append(f"Name in package.json is '{pkg_data.get('name')}', expected '{expected_name}'")
        except Exception as e:
            res["package_json_valid"] = False
            res["package_json_errors"].append(f"Error parsing package.json: {str(e)}")
    else:
        res["package_json_errors"].append("package.json does not exist")

    # 3. Code inspection (main and helpers)
    main_file_to_read = "index.jsx"
    if reg_data and reg_data.get("main"):
        main_file_to_read = reg_data.get("main")
    
    main_file_path = os.path.join(reg_dir, main_file_to_read)
    code_files = []
    if os.path.isfile(main_file_path):
        code_files.append(main_file_path)
    
    # Also find other .jsx or .js files in registry
    for f in os.listdir(reg_dir):
        if (f.endswith(".jsx") or f.endswith(".js")) and f not in [main_file_to_read, "createSuspendedRaf.js", "createSuspendedRaf.test.js"]:
            code_files.append(os.path.join(reg_dir, f))

    combined_code = ""
    for cf in code_files:
        res["files_checked"].append(get_rel_path(cf))
        try:
            with open(cf, 'r', encoding='utf-8') as f:
                combined_code += f"\n--- FILE: {os.path.basename(cf)} ---\n" + f.read()
        except Exception as e:
            pass

    # Check for createSuspendedRaf
    if "createSuspendedRaf" in combined_code or "createVisibilityGate" in combined_code:
        res["uses_suspended_raf"] = True
    
    # Check for event listeners
    if "addEventListener" in combined_code:
        res["has_event_listeners"] = True
    
    # Check for cleanup
    # Usually in useEffect cleanup return, or window removeEventListener
    if "removeEventListener" in combined_code or "cancelAnimationFrame" in combined_code or "destroy(" in combined_code or "dispose(" in combined_code:
        res["has_cleanup"] = True
    
    # Check for prefers-reduced-motion
    if "prefers-reduced-motion" in combined_code or "prefersReducedMotion" in combined_code:
        res["handles_reduced_motion"] = True

    # 4. Demo page
    demo_base = os.path.join(REPO_ROOT, "vault-main", "src", "app", "(marketing)", "demo", slug)
    demo_page_found = False
    for ext in ["js", "jsx"]:
        dp = os.path.join(demo_base, f"page.{ext}")
        if os.path.isfile(dp):
            demo_page_found = True
            res["demo_page_exists"] = True
            res["demo_page_path"] = get_rel_path(dp)
            res["files_checked"].append(get_rel_path(dp))
            break
    if not demo_page_found:
        # Check parent folder etc
        pass

    # 5. Src Component and drift check
    src_comp_dir = os.path.join(REPO_ROOT, "vault-main", "src", "components", slug)
    if os.path.isdir(src_comp_dir):
        res["src_component_exists"] = True
        for f in os.listdir(src_comp_dir):
            if os.path.isfile(os.path.join(src_comp_dir, f)):
                res["src_component_files"].append(f)
        
        # Check drift for index.jsx or main file
        src_main_path = os.path.join(src_comp_dir, main_file_to_read)
        if os.path.isfile(src_main_path) and os.path.isfile(main_file_path):
            with open(main_file_path, 'r', encoding='utf-8') as f:
                reg_main_code = f.read()
            with open(src_main_path, 'r', encoding='utf-8') as f:
                src_main_code = f.read()
            
            if reg_main_code != src_main_code:
                res["drift_found"] = True
                # Generate simple diff
                diff = difflib.unified_diff(
                    reg_main_code.splitlines(keepends=True),
                    src_main_code.splitlines(keepends=True),
                    fromfile="registry/" + main_file_to_read,
                    tofile="src/components/" + main_file_to_read,
                    n=3
                )
                res["drift_details"] = "".join(diff)

    # 6. Public JSON
    public_json_path = os.path.join(REPO_ROOT, "vault-main", "public", "r", f"{slug}.json")
    if os.path.isfile(public_json_path):
        res["public_json_exists"] = True
        res["files_checked"].append(get_rel_path(public_json_path))
        try:
            with open(public_json_path, 'r', encoding='utf-8') as f:
                pub_data = json.load(f)
            
            # Compare versions
            if reg_data:
                if pub_data.get("version") != reg_data.get("version"):
                    res["public_json_stale"] = True
                    res["public_json_issues"].append(f"Version mismatch: registry is '{reg_data.get('version')}', public JSON is '{pub_data.get('version')}'")
                if pub_data.get("name") != reg_data.get("name"):
                    res["public_json_stale"] = True
                    res["public_json_issues"].append(f"Name mismatch: registry is '{reg_data.get('name')}', public JSON is '{pub_data.get('name')}'")
                
                # Check if public JSON code has createSuspendedRaf if registry version does, etc.
                reg_files = reg_data.get("files", [])
                pub_files = pub_data.get("files", [])
                if len(reg_files) != len(pub_files):
                    res["public_json_stale"] = True
                    res["public_json_issues"].append(f"Files count mismatch: registry lists {len(reg_files)}, public JSON has {len(pub_files)}")
                
        except Exception as e:
            res["public_json_issues"].append(f"Error parsing public JSON: {str(e)}")
    else:
        res["public_json_issues"].append("Public JSON file does not exist")

    return res

if __name__ == "__main__":
    results = {}
    for s in SLUGS:
        results[s] = analyze_component(s)
    
    print(json.dumps(results, indent=2))
