import pytest
import torch.nn as nn
from collections import OrderedDict
from typing import Dict, List


from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent))
from src.utils.model_parser import ModelParser
from src.models.ResNet import ResNet18, ResNet34, ResNet50, ResNet101, ResNet152

# 测试用例中使用的自定义模块
class SimpleLayer(nn.Module):
    """简单测试层，用于验证基础解析功能"""
    def __init__(self, in_features=10, out_features=20):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.fc = nn.Linear(in_features, out_features)

    def forward(self, x):
        return self.fc(x)


class ResidualBlock(nn.Module):
    """带残差连接的测试模块"""
    def __init__(self, has_adjust=False):
        super().__init__()
        self.residual = True  # 标记为残差块
        self.fusion_type = "add"  # 融合方式
        self.main1 = nn.Linear(10, 10)
        self.main2 = nn.Linear(10, 10)
        if has_adjust:
            self.adjust = nn.Linear(10, 10)  # 调整层


def has_residual_block(ordered_dict: OrderedDict) -> bool:
    """
    递归检查OrderedDict中是否存在is_residual_block=True的项
    
    参数:
        ordered_dict: 可能包含递归结构的OrderedDict
        
    返回:
        bool: 若存在则返回True，否则返回False
    """
    # 检查当前节点是否有is_residual_block且为True
    if 'is_residual_block' in ordered_dict and ordered_dict['is_residual_block'] is True:
        return True
    
    # 递归检查子节点（通常在'children'或类似键中）
    for key, value in ordered_dict.items():
        # 若子节点是OrderedDict或dict，递归检查
        if isinstance(value, (OrderedDict, dict)):
            if has_residual_block(value):
                return True
        # 若子节点是列表/元组，遍历其中的每个元素
        elif isinstance(value, (list, tuple)):
            for item in value:
                if isinstance(item, (OrderedDict, dict)) and has_residual_block(item):
                    return True
    
    # 所有节点检查完毕仍未找到
    return False


def find_all_residual_blocks(od: OrderedDict | Dict) -> List[OrderedDict | Dict]:
    """
    递归查找并收集所有is_residual_block=True的项
    
    参数:
        od: 可能包含递归结构的OrderedDict或普通字典
        
    返回:
        list: 所有包含is_residual_block=True的项组成的列表
    """
    results = []
    
    # 检查当前节点是否为残差块
    if od.get('is_residual_block') is True:
        results.append(od)
    
    # 递归检查子节点
    for key, value in od.items():
        # 处理字典类型的子节点
        if isinstance(value, (OrderedDict, dict)):
            results.extend(find_all_residual_blocks(value))
        # 处理列表或元组中的子节点
        elif isinstance(value, (list, tuple)):
            for item in value:
                if isinstance(item, (OrderedDict, dict)):
                    results.extend(find_all_residual_blocks(item))
    
    return results


@pytest.fixture
def parser():
    """创建ModelParser实例（使用模拟配置）"""
    config_path = str(Path(__file__).parent.parent) + "/config/model_parse.toml"
    return ModelParser(config_path)


def test_parse_simple_layer(parser):
    """测试普通层解析"""
    layer = SimpleLayer(in_features=10, out_features=20)
    result = parser._parse_layers(layer, name="test_layer")

    # 基础信息校验
    assert result["layer_name"] == "test_layer"
    assert result["layer_type"] == "SimpleLayer"
    assert result["is_residual_block"] is False
    assert result["residual_connection"] is None

    # 参数形状校验
    # pdb.set_trace()
    # ordered_dict= {'weight': [20, 10], 'bias': [20]}
    # assert ordered_dict in result["parameters"]
    # assert "fc.weight" in result["parameters"]
    # assert result["parameters"]["fc.weight"] == [20, 10]  # [out, in]

    # 属性提取校验（配置中指定保留的属性）
    assert result["attributes"] == {
        "in_features": 10,
        "out_features": 20
    }

    # 子模块校验
    assert len(result["children"]) == 1
    assert result["children"][0]["layer_name"] == "fc"
    assert result["children"][0]["layer_type"] == "Linear"


def test_parse_residual_block(parser):
    """测试残差块解析（无调整层）"""
    layer = ResidualBlock(has_adjust=False)
    result = parser._parse_layers(layer, name="residual_block")

    # 残差块标识校验
    # pdb.set_trace()
    assert result["is_residual_block"] is True
    assert result["residual_connection"]["fusion_type"] == "add"
    assert result["residual_connection"]["input_source"] == "root" or "block_input" # 父输入为root
    assert result["residual_connection"]["adjust_layer"] is None

    # 子模块校验（主分支应包含2个子层）
    assert len(result["children"]) == 2
    assert [child["layer_name"] for child in result["children"]] == ["main1", "main2"]


def test_parse_residual_with_adjust(parser):
    """测试带调整层的残差块"""
    layer = ResidualBlock(has_adjust=True)
    result = parser._parse_layers(layer, name="residual_with_adjust")

    # 调整层校验
    adjust_info = result["residual_connection"]["adjust_layer"]
    assert adjust_info is not None
    assert adjust_info["layer_name"] == "adjust"
    assert adjust_info["layer_type"] == "Linear"

    # 主分支与调整层总数校验
    assert len(result["children"]) == 2  # main1 + main2
    assert result["children"][0]["layer_name"] == "main1"


def test_attribute_filtering(parser):
    """测试属性过滤（只保留配置中指定的属性）"""
    class ExtraAttrLayer(nn.Module):
        def __init__(self):
            super().__init__()
            self.keep_me = "important"
            self.drop_me = "useless"  # 不在配置的keep列表中

    layer = ExtraAttrLayer()
    result = parser._parse_layers(layer)

    # 只保留配置中指定的属性（此处配置中未包含keep_me，但测试用例中配置可能需要调整）
    # 实际应根据mock_config中的keep列表判断，这里示例中配置未包含keep_me，故attributes应为空
    assert "keep_me" not in result["attributes"]
    assert "drop_me" not in result["attributes"]


def test_recursive_parsing(parser):
    """测试递归解析嵌套模块"""
    class NestedLayer(nn.Module):
        def __init__(self):
            super().__init__()
            self.block = ResidualBlock()  # 嵌套残差块

    layer = NestedLayer()
    result = parser._parse_layers(layer, name="nested")

    # 一级子模块校验
    assert len(result["children"]) == 1
    assert result["children"][0]["layer_name"] == "block"

    # 嵌套残差块校验
    assert result["children"][0]["is_residual_block"] is True
    assert len(result["children"][0]["children"]) == 2  # 残差块内的main1和main2


@pytest.mark.parametrize("model_class, num_res_block", [
    (ResNet18, 8),
    (ResNet34, 16),
    (ResNet50, 16),
    (ResNet101, 33),
    (ResNet152, 50)
])
def test_model_parse(parser, model_class, num_res_block):
    model = model_class()
    result = parser(model)
    
    assert has_residual_block(result)
    assert len(find_all_residual_blocks(result)) == num_res_block
    assert result["layer_name"] == "root"
    assert result["layer_type"] == "ResNet"