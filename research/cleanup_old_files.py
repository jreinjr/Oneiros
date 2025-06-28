"""
Script to identify and optionally delete files that are no longer needed
after transitioning from static site to dynamic site
"""
import os
from pathlib import Path
import shutil

def identify_obsolete_files():
    """Identify files that can be safely deleted"""
    
    obsolete_files = {
        'static_site_generator.py': 'Replaced by Flask dynamic site (app.py)',
        '_backup/bibliographic_research.py': 'Replaced by bibliography_generator.py',
        '_backup/quote_research.py': 'Replaced by quote_generator.py (if exists)',
    }
    
    # Check for any generated static site directories
    obsolete_dirs = {
        'website': 'Static site output directory, no longer needed',
        'data/processed': 'JSON files replaced by database storage',
    }
    
    print("OBSOLETE FILES ANALYSIS")
    print("="*60)
    print("\nThe following files/directories can be safely deleted:\n")
    
    files_to_delete = []
    dirs_to_delete = []
    
    # Check files
    print("FILES:")
    for file_path, reason in obsolete_files.items():
        if os.path.exists(file_path):
            size = os.path.getsize(file_path)
            print(f"  ✗ {file_path}")
            print(f"    Reason: {reason}")
            print(f"    Size: {size:,} bytes")
            files_to_delete.append(file_path)
        else:
            print(f"  - {file_path} (already deleted)")
    
    # Check directories
    print("\nDIRECTORIES:")
    for dir_path, reason in obsolete_dirs.items():
        if os.path.exists(dir_path):
            # Calculate directory size
            total_size = sum(f.stat().st_size for f in Path(dir_path).rglob('*') if f.is_file())
            file_count = len(list(Path(dir_path).rglob('*')))
            print(f"  ✗ {dir_path}/")
            print(f"    Reason: {reason}")
            print(f"    Contains: {file_count} items, {total_size:,} bytes total")
            dirs_to_delete.append(dir_path)
        else:
            print(f"  - {dir_path}/ (already deleted)")
    
    print("\n" + "="*60)
    print("CURRENT ARCHITECTURE:")
    print("="*60)
    print("\nKEEP these essential files:")
    essential_files = [
        ('app.py', 'Flask web application'),
        ('database.py', 'SQLAlchemy database models'),
        ('author_processor.py', 'Main author processing logic'),
        ('bibliography_generator.py', 'Biography generation using OpenAI'),
        ('quote_generator.py', 'Quote generation using OpenAI'),
        ('data_models.py', 'Pydantic data models'),
        ('test_single_author.py', 'Test single author processing'),
        ('test_batch_authors.py', 'Test batch author processing'),
        ('test_database.py', 'Database testing utilities'),
        ('requirements.txt', 'Python dependencies'),
        ('README.md', 'Project documentation'),
        ('.env', 'Environment variables (API keys, etc.)'),
        ('data/sources.csv', 'List of authors to process'),
        ('data/beliefgraph.db', 'SQLite database'),
        ('templates/', 'Flask HTML templates'),
        ('static/', 'CSS and JS files for Flask'),
    ]
    
    print("\nEssential files for dynamic site:")
    for file_path, purpose in essential_files:
        if os.path.exists(file_path):
            print(f"  ✓ {file_path} - {purpose}")
    
    return files_to_delete, dirs_to_delete

def delete_obsolete_files(files_to_delete, dirs_to_delete):
    """Delete the obsolete files and directories"""
    print("\nDELETING OBSOLETE FILES...")
    print("="*60)
    
    # Delete files
    for file_path in files_to_delete:
        try:
            os.remove(file_path)
            print(f"  ✓ Deleted: {file_path}")
        except Exception as e:
            print(f"  ✗ Error deleting {file_path}: {e}")
    
    # Delete directories
    for dir_path in dirs_to_delete:
        try:
            shutil.rmtree(dir_path)
            print(f"  ✓ Deleted: {dir_path}/")
        except Exception as e:
            print(f"  ✗ Error deleting {dir_path}/: {e}")
    
    print("\nCleanup complete!")

def main():
    """Main function"""
    print("BeliefGraph - Cleanup Old Static Site Files")
    print("==========================================\n")
    
    files_to_delete, dirs_to_delete = identify_obsolete_files()
    
    if not files_to_delete and not dirs_to_delete:
        print("\n✓ No obsolete files found. Your project is already clean!")
        return
    
    print(f"\nFound {len(files_to_delete)} files and {len(dirs_to_delete)} directories to delete.")
    
    # Ask for confirmation
    response = input("\nDo you want to delete these files? (yes/no): ").strip().lower()
    
    if response == 'yes':
        delete_obsolete_files(files_to_delete, dirs_to_delete)
    else:
        print("\nNo files were deleted. You can run this script again later.")
        print("\nTo manually delete, remove these files:")
        for f in files_to_delete:
            print(f"  rm {f}")
        for d in dirs_to_delete:
            print(f"  rm -rf {d}")

if __name__ == '__main__':
    main()
