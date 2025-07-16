#!/usr/bin/env python3
"""
Test script for filter_quotes_by_caution.py
"""

import sys
import os
from pathlib import Path

# Add current directory to path
sys.path.append(os.path.dirname(__file__))

from filter_quotes_by_caution import QuoteFilterManager


def test_basic_functionality():
    """Test basic functionality of the quote filter manager"""
    print("Testing Quote Filter Manager...")
    print("-" * 60)
    
    # Initialize manager
    manager = QuoteFilterManager()
    
    try:
        # Test 1: Load CSV and get metrics
        print("\n1. Testing CSV loading and metrics...")
        df = manager.load_csv()
        print(f"   ✓ Loaded {len(df)} quotes")
        
        metrics = manager.get_metrics()
        print(f"   ✓ Calculated metrics successfully")
        print(f"   - Average caution ranking: {metrics['average_caution_ranking']:.2f}")
        print(f"   - Quotes marked for removal: {metrics['quotes_marked_for_removal']}")
        
        # Test 2: Print full metrics report
        print("\n2. Full metrics report:")
        manager.print_metrics(metrics)
        
        print("\n✅ All tests passed!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    sys.exit(test_basic_functionality())
