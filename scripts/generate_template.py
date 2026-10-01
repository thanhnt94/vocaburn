import os
import sys

# Ensure Vocaburn root is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from app.modules.deck.services.excel_service import ExcelDeckService

def main():
    static_path = os.path.join(root_dir, "app", "static", "Vocaburn_Template.xlsx")
    templates_path = os.path.join(root_dir, "templates", "Vocaburn_Template.xlsx")
    master_path = os.path.join(root_dir, "templates", "Vocaburn_Master_Template.xlsx")
    
    os.makedirs(os.path.dirname(static_path), exist_ok=True)
    os.makedirs(os.path.dirname(templates_path), exist_ok=True)
    
    ExcelDeckService.generate_template_excel(output_path=static_path)
    ExcelDeckService.generate_template_excel(output_path=templates_path)
    ExcelDeckService.generate_template_excel(output_path=master_path)
    
    print(f"Generated Vocaburn templates successfully:")
    print(f" - {static_path}")
    print(f" - {templates_path}")
    print(f" - {master_path}")

if __name__ == "__main__":
    main()
